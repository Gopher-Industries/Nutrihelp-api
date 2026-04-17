import React, { useEffect, useState } from 'react';
import './ScanProducts.css'; // You can use the same CSS file or create a new one.
import SubHeading from '../../../components/general_components/headings/SubHeading';
import { useParams } from 'react-router-dom';

function FoodDetails() {
  const { foodName } = useParams(); // Get the food name from the URL parameters
  const [imageURL, setImageURL] = useState(null);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const apiKey = '47217879-18b11cf452a451d275bbc4eb6';
        const response = await fetch(
          `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(foodName)}&image_type=photo`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.hits && data.hits.length > 0) {
            setImageURL(data.hits[0].webformatURL);
          } else {
            setImageURL(null);
          }
        } else {
          console.error('Failed to fetch image from Pixabay.');
        }
      } catch (error) {
        console.error('Error fetching image:', error.message);
      }
    };

    fetchImage();
  }, [foodName]);

  return (
    <div className="scan-products-container">
      <SubHeading text="Food Details" />
      <h2>{foodName}</h2>
      {imageURL ? (
        <img src={imageURL} alt={foodName} className="food-image" />
      ) : (
        <p>No image found for {foodName}.</p>
      )}
    </div>
  );
}

export default FoodDetails;
