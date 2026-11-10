import io
import numpy as np
import tensorflow as tf
from PIL import Image

# Load your custom-trained waste classification model
model = tf.keras.models.load_model("waste_classifier.keras")

def process_and_classify_image(image_bytes: bytes):
    """
    Receives raw image bytes, runs inference using the custom TensorFlow model,
    and intelligently handles both 1-node and 2-node model architectures.
    """
    try:
        # 1. Open the image and convert to RGB
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # 2. Resize to the 224x224 resolution expected by MobileNetV2
        image = image.resize((224, 224))
        
        # 3. Convert the image to a NumPy array and add a batch dimension
        img_array = tf.keras.preprocessing.image.img_to_array(image)
        img_array = np.expand_dims(img_array, axis=0)
        
        # 4. Run the AI inference and get the prediction array
        # NOTE: Preprocessing is explicitly left out here because it is baked into the model.
        predictions = model.predict(img_array)[0]
        
        # 5. Dynamically extract the result based on model architecture
        if len(predictions) > 1:
            class_idx = np.argmax(predictions)
            final_confidence = float(predictions[class_idx])
            detected_status = "overflow" if class_idx == 1 else "normal"
        else:
            raw_score = float(predictions[0])
            if raw_score >= 0.5:
                detected_status = "overflow"
                final_confidence = raw_score 
            else:
                detected_status = "normal"
                final_confidence = 1.0 - raw_score 
            
        return {
            "status": "success",
            "detected_category": detected_status,
            "confidence": round(final_confidence * 100, 2)
        }

    except Exception as e:
        print(f"Error processing image: {e}")
        return {
            "status": "error",
            "message": str(e)
        }