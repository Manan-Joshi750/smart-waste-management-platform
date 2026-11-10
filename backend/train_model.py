import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing import image_dataset_from_directory
import os

# --- Configuration ---
# Update this path to where your 'normal' and 'overflow' folders are located
DATASET_DIR = "waste_dataset" 
BATCH_SIZE = 16
IMG_SIZE = (224, 224) # MobileNetV2 standard input size
EPOCHS = 10

def build_and_train_model():
    print("Loading dataset...")
    
    # Load training data with a 20% validation split
    train_dataset = image_dataset_from_directory(
        DATASET_DIR,
        validation_split=0.2,
        subset="training",
        seed=123,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE
    )

    validation_dataset = image_dataset_from_directory(
        DATASET_DIR,
        validation_split=0.2,
        subset="validation",
        seed=123,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE
    )

    class_names = train_dataset.class_names
    print(f"Detected classes: {class_names}")

    # Data Augmentation: Helps the model generalize by slightly altering images
    data_augmentation = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.1),
        tf.keras.layers.RandomZoom(0.1),
    ])

    # --- Build the Model ---
    # Load MobileNetV2 without its top classification layer
    base_model = MobileNetV2(input_shape=IMG_SIZE + (3,), include_top=False, weights='imagenet')
    base_model.trainable = False # Freeze base model initially

    # Add custom layers for our specific binary classification
    inputs = tf.keras.Input(shape=IMG_SIZE + (3,))
    x = data_augmentation(inputs)
    x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
    x = base_model(x, training=False)
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.2)(x)
    # Output layer: 1 node with sigmoid activation for binary classification (0 or 1)
    outputs = Dense(1, activation='sigmoid')(x) 
    
    model = Model(inputs, outputs)

    # --- Compile and Train ---
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
                  loss=tf.keras.losses.BinaryCrossentropy(),
                  metrics=['accuracy'])

    print("Starting training...")
    history = model.fit(train_dataset, validation_data=validation_dataset, epochs=EPOCHS)

    # Save the trained model
    model_filename = "waste_classifier.keras"
    model.save(model_filename)
    print(f"\nModel saved successfully as {model_filename}")
    print(f"Class 0: {class_names[0]} (Normal)")
    print(f"Class 1: {class_names[1]} (Overflow)")

if __name__ == "__main__":
    if not os.path.exists(DATASET_DIR):
        print(f"Error: Directory '{DATASET_DIR}' not found. Please create it and add your images.")
    else:
        build_and_train_model()