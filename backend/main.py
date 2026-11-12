from ml_model import process_and_classify_image
from bson import ObjectId
from fastapi import FastAPI, HTTPException, File, UploadFile, Form, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from database import bins_collection, history_collection
from datetime import datetime, timezone

app = FastAPI(title="Smart Waste API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WebSocket Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
# ------------------------------------

@app.get("/")
def read_root():
    return {"status": "Active", "message": "Waste Management API is running"}

@app.get("/api/bins")
def get_all_bins():
    raw_bins = list(bins_collection.find())
    formatted_bins = []
    for bin_doc in raw_bins:
        bin_doc["id"] = str(bin_doc["_id"])
        del bin_doc["_id"] 
        formatted_bins.append(bin_doc)
    return {"status": "success", "count": len(formatted_bins), "data": formatted_bins}

@app.post("/api/bins", status_code=201)
async def create_bin_report(
    latitude: float = Form(...),
    longitude: float = Form(...),
    file: UploadFile = File(...)
):
    image_bytes = await file.read()
    
    try:
        # 1. Get the new dictionary response from your TensorFlow AI
        ai_result = process_and_classify_image(image_bytes)
        
        # 2. Check for AI processing errors
        if ai_result.get("status") == "error":
            raise ValueError(ai_result.get("message", "AI processing failed"))
            
        # 3. Extract the category (normal or overflow)
        ai_status = ai_result.get("detected_category")
        
        # 4. Format the volume string to include the AI's confidence score
        confidence = ai_result.get("confidence", 0)
        ai_volume = f"High ({confidence}%)" if ai_status == "overflow" else f"Low ({confidence}%)"
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    report_dict = {
        "latitude": latitude,
        "longitude": longitude,
        "status": ai_status,
        "volume": ai_volume,
        "filename": file.filename,
        "reported_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = bins_collection.insert_one(report_dict)
    
    if result.inserted_id:
        await manager.broadcast("update_bins")
        return {"status": "success", "message": "Image analyzed and saved successfully"}
    
    raise HTTPException(status_code=500, detail="Failed to save report")

@app.delete("/api/bins/{bin_id}")
async def delete_bin(bin_id: str):
    try:
        bin_doc = bins_collection.find_one({"_id": ObjectId(bin_id)})
        if not bin_doc:
            raise HTTPException(status_code=404, detail="Bin not found")

        cleaned_time = datetime.now(timezone.utc)
        reported_time_str = bin_doc.get("reported_at")
        resolution_minutes = 0
        
        if reported_time_str:
            try:
                reported_time = datetime.fromisoformat(reported_time_str)
                resolution_minutes = int((cleaned_time - reported_time).total_seconds() / 60)
            except ValueError:
                pass

        history_doc = {
            "latitude": bin_doc["latitude"],
            "longitude": bin_doc["longitude"],
            "status": bin_doc["status"],
            "reported_at": reported_time_str,
            "cleaned_at": cleaned_time.isoformat(),
            "resolution_time_minutes": resolution_minutes
        }
        history_collection.insert_one(history_doc)

        result = bins_collection.delete_one({"_id": ObjectId(bin_id)})
        if result.deleted_count == 1:
            await manager.broadcast("update_bins")
            return {"status": "success", "message": "Bin archived and removed from active map"}
            
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Bin ID format")

@app.get("/api/analytics")
def get_analytics():
    history = list(history_collection.find())
    total_time = 0
    valid_records = 0
    heatmap_data = []
    last_cleared_time = None
    clearance_history = []
    
    if history:
        sorted_history = sorted(
            [doc for doc in history if doc.get("cleaned_at")], 
            key=lambda x: x["cleaned_at"], 
            reverse=True
        )
        if sorted_history:
            last_cleared_time = sorted_history[0]["cleaned_at"]
            
        for doc in sorted_history:
            clearance_history.append({
                "id": str(doc.get("_id", ObjectId())),
                "cleaned_at": doc.get("cleaned_at"),
                "latitude": doc.get("latitude"),
                "longitude": doc.get("longitude")
            })

    for doc in history:
        if doc.get("resolution_time_minutes") is not None:
            total_time += doc["resolution_time_minutes"]
            valid_records += 1
            
        heatmap_data.append([doc["latitude"], doc["longitude"], 1])
        
    avg_time = round(total_time / valid_records) if valid_records > 0 else 0
    
    return {
        "status": "success", 
        "average_resolution_time": avg_time,
        "total_cleaned": len(history),
        "heatmap_data": heatmap_data,
        "last_cleared": last_cleared_time,
        "clearance_history": clearance_history
    }