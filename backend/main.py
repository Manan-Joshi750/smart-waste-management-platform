from bson import ObjectId
from fastapi import FastAPI, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from database import bins_collection

app = FastAPI(title="Smart Waste API")

# Add CORS middleware to allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace "*" with your React app's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the expected structure for a waste report
class WasteReport(BaseModel):
    latitude: float
    longitude: float
    status: str
    volume: str

@app.get("/")
def read_root():
    return {"status": "Active", "message": "Waste Management API is running"}

@app.get("/api/bins")
def get_all_bins():
    # Fetch all records from MongoDB
    raw_bins = list(bins_collection.find())
    formatted_bins = []
    
    for bin_doc in raw_bins:
        # Convert the MongoDB ObjectId to a standard string
        bin_doc["id"] = str(bin_doc["_id"])
        
        # Remove the un-serializable original _id key
        del bin_doc["_id"] 
        
        formatted_bins.append(bin_doc)
        
    return {"status": "success", "count": len(formatted_bins), "data": formatted_bins}

# Route: Insert AI-classified waste data into MongoDB
@app.post("/api/bins", status_code=201)
def create_bin_report(report: WasteReport):
    # Use jsonable_encoder instead of report.dict()
    report_dict = jsonable_encoder(report)
    
    # Insert into MongoDB
    result = bins_collection.insert_one(report_dict)
    
    if result.inserted_id:
        return {"status": "success", "message": "Report saved successfully"}
    
    raise HTTPException(status_code=500, detail="Failed to save report")

@app.delete("/api/bins/{bin_id}")
def delete_bin(bin_id: str):
    try:
        # Convert the string ID back to a MongoDB ObjectId and delete
        result = bins_collection.delete_one({"_id": ObjectId(bin_id)})
        
        if result.deleted_count == 1:
            return {"status": "success", "message": "Bin marked as cleaned and removed"}
        
        raise HTTPException(status_code=404, detail="Bin not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Bin ID format")