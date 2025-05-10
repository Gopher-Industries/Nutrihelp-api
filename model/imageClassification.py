#!/usr/bin/env python3.10

import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import sys
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sn
import numpy as np
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import VGG19, VGG16
from tensorflow.keras.layers import AveragePooling2D, Conv2D, MaxPooling2D, Dropout, Dense, Input, Flatten
from tensorflow.keras.models import Sequential
from tensorflow.keras.utils import load_img, img_to_array
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import train_test_split

from tensorflow.keras.models import load_model
from PIL import Image
import io

# Get the relative path to the model file
model_path = os.path.join('model', 'modeltt.h5')

try:
    # Load the pre-trained model
    model = load_model(model_path)
except Exception as e:
    print("Error loading model:", e)
    sys.exit(1)

from tensorflow.keras.preprocessing.image import load_img, img_to_array

cal_values = """Apple Braeburn:~52 calories per 100 grams
Apple Crimson Snow:~52 calories per 100 grams
Apple Golden 1:~52 calories per 100 grams
Apple Golden 2:~52 calories per 100 grams
Apple Golden 3:~52 calories per 100 grams
Apple Granny Smith:~52 calories per 100 grams
Apple Pink Lady:~52 calories per 100 grams
Apple Red 1:~52 calories per 100 grams
Apple Red 2:~52 calories per 100 grams
Apple Red 3:~52 calories per 100 grams
Apple Red Delicious:~52 calories per 100 grams
Apple Red Yellow 1:~52 calories per 100 grams
Apple Red Yellow 2:~52 calories per 100 grams
Apricot:~48 calories per 100 grams
Avocado:~160 calories per 100 grams
Avocado ripe:~160 calories per 100 grams
Banana:~89 calories per 100 grams
Banana Lady Finger:~89 calories per 100 grams
Banana Red:~89 calories per 100 grams
Beetroot:~43 calories per 100 grams
Blueberry:~57 calories per 100 grams
Cactus fruit:~50 calories per 100 grams
Cantaloupe 1:~34 calories per 100 grams
Cantaloupe 2:~34 calories per 100 grams
Carambula:~31 calories per 100 grams
Cauliflower:~25 calories per 100 grams
Cherry 1:~50 calories per 100 grams
Cherry 2:~50 calories per 100 grams
Cherry Rainier:~50 calories per 100 grams
Cherry Wax Black:~50 calories per 100 grams
Cherry Wax Red:~50 calories per 100 grams
Cherry Wax Yellow:~50 calories per 100 grams
Chestnut:~213 calories per 100 grams
Clementine:~47 calories per 100 grams
Cocos:~354 calories per 100 grams
Corn:~86 calories per 100 grams
Corn Husk:~86 calories per 100 grams
Cucumber Ripe:~15 calories per 100 grams
Cucumber Ripe 2:~15 calories per 100 grams
Dates:~277 calories per 100 grams
Eggplant:~25 calories per 100 grams
Fig:~74 calories per 100 grams
Ginger Root:~50 calories per 100 grams
Granadilla:~97 calories per 100 grams
Grape Blue:~69 calories per 100 grams
Grape Pink:~69 calories per 100 grams
Grape White:~69 calories per 100 grams
Grape White 2:~69 calories per 100 grams
Grape White 3:~69 calories per 100 grams
Grape White 4:~69 calories per 100 grams
Grapefruit Pink:~42 calories per 100 grams
Grapefruit White:~42 calories per 100 grams
Guava:~68 calories per 100 grams
Hazelnut:~628 calories per 100 grams
Huckleberry:~40 calories per 100 grams
Kaki:~81 calories per 100 grams
Kiwi:~61 calories per 100 grams
Kohlrabi:~27 calories per 100 grams
Kumquats:~71 calories per 100 grams
Lemon:~29 calories per 100 grams
Lemon Meyer:~29 calories per 100 grams
Limes:~30 calories per 100 grams
Lychee:~66 calories per 100 grams
Mandarine:~53 calories per 100 grams
Mango:~60 calories per 100 grams
Mango Red:~60 calories per 100 grams
Mangostan:~73 calories per 100 grams
Maracuja:~97 calories per 100 grams
Melon Piel de Sapo:~50 calories per 100 grams
Mulberry:~43 calories per 100 grams
Nectarine:~44 calories per 100 grams
Nectarine Flat:~44 calories per 100 grams
Nut Forest:~50 calories per 100 grams
Nut Pecan:~50 calories per 100 grams
Onion Red:~50 calories per 100 grams
Onion Red Peeled:~50 calories per 100 grams
Onion White:~50 calories per 100 grams
Orange:~47 calories per 100 grams
Papaya:~43 calories per 100 grams
Passion Fruit:~50 calories per 100 grams
Peach:~39 calories per 100 grams
Peach 2:~39 calories per 100 grams
Peach Flat:~39 calories per 100 grams
Pear:~57 calories per 100 grams
Pear 2:~57 calories per 100 grams
Pear Abate:~57 calories per 100 grams
Pear Forelle:~57 calories per 100 grams
Pear Kaiser:~57 calories per 100 grams
Pear Monster:~57 calories per 100 grams
Pear Red:~57 calories per 100 grams
Pear Stone:~57 calories per 100 grams
Pear Williams:~57 calories per 100 grams
Pepino:~42 calories per 100 grams
Pepper Green:~50 calories per 100 grams
Pepper Orange:~50 calories per 100 grams
Pepper Red:~50 calories per 100 grams
Pepper Yellow:~50 calories per 100 grams
Physalis:~53 calories per 100 grams
Physalis with Husk:~53 calories per 100 grams
Pineapple:~50 calories per 100 grams
Pineapple Mini:~50 calories per 100 grams
Pitahaya Red:~50 calories per 100 grams
Plum:~46 calories per 100 grams
Plum 2:~46 calories per 100 grams
Plum 3:~46 calories per 100 grams
Pomegranate:~83 calories per 100 grams
Pomelo Sweetie:~50 calories per 100 grams
Potato Red:~50 calories per 100 grams
Potato Red Washed:~50 calories per 100 grams
Potato Sweet:~50 calories per 100 grams
Potato White:~50 calories per 100 grams
Quince:~57 calories per 100 grams
Rambutan:~68 calories per 100 grams
Raspberry:~52 calories per 100 grams
Redcurrant:~56 calories per 100 grams
Salak:~82 calories per 100 grams
Strawberry:~32 calories per 100 grams
Strawberry Wedge:~32 calories per 100 grams
Tamarillo:~31 calories per 100 grams
Tangelo:~53 calories per 100 grams
Tomato 1:~18 calories per 100 grams
Tomato 2:~18 calories per 100 grams
Tomato 3:~18 calories per 100 grams
Tomato 4:~18 calories per 100 grams
Tomato Cherry Red:~18 calories per 100 grams
Tomato Heart:~18 calories per 100 grams
Tomato Maroon:~18 calories per 100 grams
Tomato not Ripened:~18 calories per 100 grams
Tomato Yellow:~18 calories per 100 grams
Walnut:~654 calories per 100 grams
Watermelon:~30 calories per 100 grams"""

calories = cal_values.splitlines()

# Read image data from stdin
image_data = sys.stdin.buffer.read()

# Load image using PIL
image = Image.open(io.BytesIO(image_data))

# Resize image to (224, 224)
image = image.resize((224, 224))

# Convert image to numpy array
image_array = np.array(image) / 255.0  # Normalize image data

# Add batch dimension
image_array = np.expand_dims(image_array, axis=0)

# Perform prediction
prediction_result = model.predict(image_array).argmax()

# Output prediction result
print(prediction_result, calories[prediction_result])
