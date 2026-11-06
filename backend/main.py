from ml_model import process_and_classify_image
from bson import ObjectId
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
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

# Route: Receive Image + Location, Run AI (Placeholder), Save to MongoDB
@app.post("/api/bins", status_code=201)
async def create_bin_report(
    latitude: float = Form(...),
    longitude: float = Form(...),
    file: UploadFile = File(...)
):
    # 1. Read the uploaded file into memory
    image_bytes = await file.read()
    
    # 2. Pass the bytes to the AI model
    try:
        ai_status, ai_volume = process_and_classify_image(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # 3. Save the classified data to MongoDB
    report_dict = {
        "latitude": latitude,
        "longitude": longitude,
        "status": ai_status,
        "volume": ai_volume,
        "filename": file.filename
    }
    
    result = bins_collection.insert_one(report_dict)
    
    if result.inserted_id:
        return {"status": "success", "message": "Image analyzed and saved successfully"}
    
    raise HTTPException(status_code=500, detail="Failed to save report")

@app.delete("/api/bins/{bin_id}")
def delete_bin(bin_id: str):
    try:
        result = bins_collection.delete_one({"_id": ObjectId(bin_id)})
        if result.deleted_count == 1:
            return {"status": "success", "message": "Bin marked as cleaned and removed"}
        raise HTTPException(status_code=404, detail="Bin not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Bin ID format")