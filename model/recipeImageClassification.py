# FOR THIS API TO WORK, YOU MUST HAVE THE AI MODEL FILE SAVED TO THE PREDICTION_MODELS FOLDER
# THIS FILE CAN BE FOUND UPLOADED TO THE NUTRIHELP TEAMS SITE
# IT IS CALLED BEST_MODEL_CLASS.HDF5

import os
import io
import sys
import numpy as np
import tensorflow.keras.backend as K
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from PIL import Image

# Loading the best saved model to make predictions
K.clear_session()
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
model_path = os.path.join('prediction_models','best_model_class.hdf5')
model_best = load_model(model_path, compile=False)

food_list = ['apple_pie', 'baby_back_ribs', 'baklava', 'beef_carpaccio', 'beef_tartare', 'beet_salad', 'beignets', 'bibimbap', 'bread_pudding', 'breakfast_burrito', 'bruschetta', 'caesar_salad', 'cannoli', 'caprese_salad', 'carrot_cake', 'ceviche', 'cheese_plate', 'cheesecake', 'chicken_curry', 'chicken_quesadilla', 'chicken_wings', 'chocolate_cake', 'chocolate_mousse', 'churros', 'clam_chowder', 'club_sandwich', 'crab_cakes', 'creme_brulee', 'croque_madame', 'cup_cakes', 'deviled_eggs', 'donuts', 'dumplings', 'edamame', 'eggs_benedict', 'escargots', 'falafel', 'filet_mignon', 'fish_and_chips', 'foie_gras', 'french_fries', 'french_onion_soup', 'french_toast', 'fried_calamari', 'fried_rice', 'frozen_yogurt', 'garlic_bread', 'gnocchi', 'greek_salad', 'grilled_cheese_sandwich', 'grilled_salmon', 'guacamole', 'gyoza', 'hamburger', 'hot_and_sour_soup', 'hot_dog', 'huevos_rancheros', 'hummus', 'ice_cream', 'lasagna', 'lobster_bisque', 'lobster_roll_sandwich', 'macaroni_and_cheese', 'macarons', 'miso_soup', 'mussels', 'nachos', 'omelette', 'onion_rings', 'oysters', 'pad_thai', 'paella', 'pancakes', 'panna_cotta', 'peking_duck', 'pho', 'pizza', 'pork_chop', 'poutine', 'prime_rib', 'pulled_pork_sandwich', 'ramen', 'ravioli', 'red_velvet_cake', 'risotto', 'samosa', 'sashimi', 'scallops', 'seaweed_salad', 'shrimp_and_grits', 'spaghetti_bolognese', 'spaghetti_carbonara', 'spring_rolls', 'steak', 'strawberry_shortcake', 'sushi', 'tacos', 'takoyaki', 'tiramisu', 'tuna_tartare', 'waffles']

def predict_class(model, img):
  
  img = image.img_to_array(img)                    
  img = np.expand_dims(img, axis=0)         
  img /= 255.                                      

  pred = model.predict(img)
  index = np.argmax(pred)
  food_list.sort()
  pred_value = food_list[index]
    
  return pred_value

img = Image.open('./uploads/image.jpg')
# Predict img and return result
result = predict_class(model_best, img)
print(result)