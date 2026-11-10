import os
from PIL import Image

DATASET_DIR = "waste_dataset"

def convert_dataset_to_jpg():
    print("Scanning dataset for non-standard image formats...")
    converted_count = 0
    
    # Walk through the normal and overflow folders
    for root, dirs, files in os.walk(DATASET_DIR):
        for file in files:
            # Check if it's NOT a format TensorFlow natively supports
            if not file.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif')):
                file_path = os.path.join(root, file)
                try:
                    # Open the file and convert to standard RGB
                    img = Image.open(file_path).convert("RGB")
                    
                    # Create the new filename with .jpg extension
                    new_filename = os.path.splitext(file_path)[0] + ".jpg"
                    
                    # Save as standard JPEG
                    img.save(new_filename, "JPEG")
                    
                    # Delete the old unreadable file
                    os.remove(file_path)
                    converted_count += 1
                except Exception as e:
                    print(f"Could not convert {file}: {e}")
                    
    print(f"Success! Converted {converted_count} files to standard JPG.")

if __name__ == "__main__":
    convert_dataset_to_jpg()