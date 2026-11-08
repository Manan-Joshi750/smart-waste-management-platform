from ml_model import process_and_classify_image
from bson import ObjectId
from fastapi import FastAPI, HTTPException, File, UploadFile, Form, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from database import bins_collection

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
            # Keep connection alive
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
        ai_status, ai_volume = process_and_classify_image(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    report_dict = {
        "latitude": latitude,
        "longitude": longitude,
        "status": ai_status,
        "volume": ai_volume,
        "filename": file.filename
    }
    
    result = bins_collection.insert_one(report_dict)
    
    if result.inserted_id:
        # Broadcast to all connected frontends that data has changed
        await manager.broadcast("update_bins")
        return {"status": "success", "message": "Image analyzed and saved successfully"}
    
    raise HTTPException(status_code=500, detail="Failed to save report")

@app.delete("/api/bins/{bin_id}")
async def delete_bin(bin_id: str):
    try:
        result = bins_collection.delete_one({"_id": ObjectId(bin_id)})
        if result.deleted_count == 1:
            # Broadcast to all connected frontends that a bin was cleaned
            await manager.broadcast("update_bins")
            return {"status": "success", "message": "Bin marked as cleaned and removed"}
        raise HTTPException(status_code=404, detail="Bin not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Bin ID format")