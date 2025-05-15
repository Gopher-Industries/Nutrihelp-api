"""
Model Test Generator for Food Classification

This script creates a simplified TensorFlow model for testing the image classification API.
The model classifies images based on their dominant colors, making it useful for testing
without requiring a real pre-trained model.

Usage: python tools/image_classification/fix_model.py
"""

import tensorflow as tf
import numpy as np
import os
import random

print("Creating a color-based classification model for testing...")

# Create a very basic model with minimal layers
model = tf.keras.Sequential([
    tf.keras.layers.Conv2D(8, (3, 3), activation='relu', input_shape=(224, 224, 3)),
    tf.keras.layers.MaxPooling2D((2, 2)),
    tf.keras.layers.Flatten(),
    tf.keras.layers.Dense(16, activation='relu'),
    tf.keras.layers.Dense(43, activation='softmax')  # 43 food classes
])

model.compile(optimizer='adam', loss='categorical_crossentropy')

# Fix seed for reproducibility
random.seed(42)
np.random.seed(42)

# Primary food categories mapped to dominant colors
# This allows the model to predict different food classes based on image colors
color_groups = {
    'red': [9, 37, 41],         # curry, pizza, steak
    'green': [5, 7, 24],        # salads
    'yellow': [0, 8, 22, 27],   # apple pie, carrot cake, frozen yogurt, ice cream
    'brown': [1, 28, 39, 40],   # ribs, lasagne, spaghetti dishes
    'white': [14, 30, 34]       # cupcakes, macarons, omelette
}

# Manual bias approach - to ensure the model doesn't always predict the same class
biases = np.zeros(43)
for i in range(43):
    biases[i] = -10.0  # All classes heavily biased against by default

# Set up more reasonable biases for key classes we want to see frequently
biases[0] = -2.0   # Apple pie
biases[5] = -2.0   # Caesar salad
biases[9] = -2.0   # Chicken curry
biases[14] = -2.0  # Cupcakes
biases[24] = -2.0  # Greek salad
biases[26] = -2.0  # Hamburger
biases[28] = -2.0  # Lasagne
biases[37] = -2.0  # Pizza
biases[39] = -2.0  # Spaghetti bolognese
biases[41] = -2.0  # Steak

# Create convolutional filters sensitive to different colors
# This makes the model respond differently to images with different dominant colors
filters = np.random.randn(3, 3, 3, 8) * 0.1  # Small random initialization

# Create red-sensitive filters
filters[:, :, 0, 0] = np.random.rand(3, 3) * 1.5  # Red channel
filters[:, :, 1, 0] = np.random.rand(3, 3) * 0.2  # Green channel
filters[:, :, 2, 0] = np.random.rand(3, 3) * 0.2  # Blue channel

# Create green-sensitive filters
filters[:, :, 0, 1] = np.random.rand(3, 3) * 0.2
filters[:, :, 1, 1] = np.random.rand(3, 3) * 1.5
filters[:, :, 2, 1] = np.random.rand(3, 3) * 0.2

# Create blue-sensitive filters
filters[:, :, 0, 2] = np.random.rand(3, 3) * 0.2
filters[:, :, 1, 2] = np.random.rand(3, 3) * 0.2
filters[:, :, 2, 2] = np.random.rand(3, 3) * 1.5

# Create yellow-sensitive filters (high red + green, low blue)
filters[:, :, 0, 3] = np.random.rand(3, 3) * 1.2
filters[:, :, 1, 3] = np.random.rand(3, 3) * 1.2
filters[:, :, 2, 3] = np.random.rand(3, 3) * 0.1

# Create brown-sensitive filters
filters[:, :, 0, 4] = np.random.rand(3, 3) * 1.0
filters[:, :, 1, 4] = np.random.rand(3, 3) * 0.7
filters[:, :, 2, 4] = np.random.rand(3, 3) * 0.3

# Create brightness-sensitive filter
filters[:, :, 0, 5] = np.random.rand(3, 3) * 1.0
filters[:, :, 1, 5] = np.random.rand(3, 3) * 1.0
filters[:, :, 2, 5] = np.random.rand(3, 3) * 1.0

# The remaining filters can be more random
filters[:, :, :, 6:] = np.random.randn(3, 3, 3, 2) * 0.3

# Create the final dense layer weights - mapping from features to output classes
dense_weights = np.zeros((16, 43))

# Map filter 0 (red-sensitive) to red foods
for class_id in color_groups['red']:
    dense_weights[0, class_id] = 5.0 

# Map filter 1 (green-sensitive) to green foods
for class_id in color_groups['green']:
    dense_weights[1, class_id] = 5.0

# Map filter 3 (yellow-sensitive) to yellow foods
for class_id in color_groups['yellow']:
    dense_weights[3, class_id] = 5.0

# Map filter 4 (brown-sensitive) to brown foods
for class_id in color_groups['brown']:
    dense_weights[4, class_id] = 5.0

# Map filter 5 (brightness-sensitive) to white foods
for class_id in color_groups['white']:
    dense_weights[5, class_id] = 5.0

# Set the weights for the model
model.layers[0].set_weights([filters, np.zeros(8)])  # Conv layer
model.layers[-1].set_weights([dense_weights, biases])  # Final dense layer

# Make sure directory exists
if not os.path.exists('prediction_models'):
    os.makedirs('prediction_models')

# Save the model
model.save('prediction_models/best_model_class.hdf5')

print("Fixed model created and saved to prediction_models/best_model_class.hdf5")

# Test with sample data
print("\nTesting model with sample colors...")
test_colors = [
    ('red', np.ones((1, 224, 224, 3)) * [0.8, 0.2, 0.2]),
    ('green', np.ones((1, 224, 224, 3)) * [0.2, 0.8, 0.2]),
    ('yellow', np.ones((1, 224, 224, 3)) * [0.9, 0.8, 0.2]),
    ('brown', np.ones((1, 224, 224, 3)) * [0.6, 0.4, 0.2]),
    ('white', np.ones((1, 224, 224, 3)) * [0.9, 0.9, 0.9])
]

# Class mapping for output
class_mapping = {
    0: 'apple_pie', 1: 'baby_back_ribs', 2: 'beef_tartare', 3: 'beignets', 4: 'bruschetta',
    5: 'caesar_salad', 6: 'cannoli', 7: 'caprese_salad', 8: 'carrot_cake', 9: 'chicken_curry',
    10: 'chicken_quesadilla', 11: 'chicken_wings', 12: 'chocolate_cake', 13: 'creme_brulee',
    14: 'cup_cakes', 15: 'deviled_eggs', 16: 'donuts', 17: 'dumplings', 18: 'edamame',
    19: 'eggs_benedict', 20: 'french_fries', 21: 'fried_rice', 22: 'frozen_yogurt',
    23: 'garlic_bread', 24: 'greek_salad', 25: 'grilled_cheese_sandwich', 26: 'hamburger',
    27: 'ice_cream', 28: 'lasagne', 29: 'macaroni_cheese', 30: 'macarons', 31: 'miso_soup',
    32: 'mussels', 33: 'nachos', 34: 'omelette', 35: 'onion_rings', 36: 'oysters',
    37: 'pizza', 38: 'ramen', 39: 'spaghetti_bolognese', 40: 'spaghetti_carbonara',
    41: 'steak', 42: 'strawberry_shortcake'
}

for color_name, color_data in test_colors:
    predictions = model.predict(color_data, verbose=0)
    top3_indices = np.argsort(predictions[0])[-3:][::-1]
    print(f"{color_name.upper()} color prediction:")
    for i, idx in enumerate(top3_indices):
        print(f"  {i+1}. {class_mapping[idx]} ({predictions[0][idx]:.4f})")

print("\nFixed model is ready. Please restart the server to apply changes.")
print("For real classification, replace with the actual trained model from NutriHelp Teams.") 