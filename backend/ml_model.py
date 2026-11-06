import io
import random
from PIL import Image
from ultralytics import YOLO

# Load the YOLOv8 nano model (it will auto-download 'yolov8n.pt' on first run)
model = YOLO('yolov8n.pt')

def process_and_classify_image(image_bytes: bytes):
    """
    Receives raw image bytes, runs real YOLOv8 AI inference, 
    and maps the detected objects to project-specific waste categories.
    """
    try:
        # 1. Open the image
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        raise ValueError(f"Invalid image file: {str(e)}")

    # 2. Run real AI inference
    results = model(image)
    
    # 3. Extract detected object names
    detected_classes = []
    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])
            class_name = model.names[class_id]
            detected_classes.append(class_name)

    # 4. Map real AI detections to our Smart Waste categories
    # YOLO knows 'bottle', 'cup', 'apple', 'banana', etc.
    plastic_indicators = ['bottle', 'cup', 'wine glass']
    organic_indicators = ['apple', 'banana', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'sandwich']
    
    predicted_status = "Normal" # Default if nothing dangerous is found
    
    for item in detected_classes:
        if item in plastic_indicators:
            predicted_status = "Plastic Overflow"
            break  # Highest priority, stop checking
        elif item in organic_indicators:
            predicted_status = "Organic Overflow"
            
    # Calculate a mock volume based on the number of objects detected (for realism)
    base_volume = random.randint(20, 50)
    extra_volume = len(detected_classes) * 15
    final_volume = min(100, base_volume + extra_volume)
    predicted_volume = f"{final_volume}%"
    
    return predicted_status, predicted_volume