import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // Use useNavigate instead of useHistory
import './ScanProducts.css';
import SubHeading from '../../../components/general_components/headings/SubHeading';

function ScanProducts() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState([]);
  const fileInputRef = useRef(null);

  const navigate = useNavigate(); // Initialize useNavigate hook

  useEffect(() => {
    const storedHistory = localStorage.getItem('uploadHistory');
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  const handleFileUploadChange = (e) => {
    const file = e.target.files[0];
    setUploadedImage(file);
  };

  const handleImageUpload = async () => {
    try {
      // Create FormData object to send image file
      const formData = new FormData();
      formData.append('image', uploadedImage);

      // Make POST request to backend API
      const response = await fetch('https://localhost:443/api/imageClassification', {
        method: 'POST',
        body: formData,
      });

      // Check the response status
      if (response.ok) {
        const data = await response.json();
        const prediction = data.prediction;

        // Update history in localStorage with recognized food
        const newEntry = {
          time: new Date().toLocaleString(),
          imageName: uploadedImage.name,
          prediction: prediction,
        };
        const updatedHistory = [...history, newEntry];
        setHistory(updatedHistory);
        localStorage.setItem('uploadHistory', JSON.stringify(updatedHistory));

        // Redirect to the food details page with the recognized food name
        navigate(`/food-details/${prediction}`);
      } else {
        alert('Failed to classify image. Please try again.');
      }
    } catch (error) {
      // Handle errors
      console.error('Error classifying image:', error.message);
      alert('Failed to classify image. An error occurred.');
    }
  };

  const handleViewHistory = () => {
    navigate('/upload-history'); // Use navigate to go to history page
  };

  return (
    <div>
      <div className="scan-products-container">
        <h1>Upload a Photo</h1>
          {/* Select image */}
          <div className="scan-products-form">
            <label className="scan-products-label">Image</label>
            <div className="upload-section" onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer' }}>
              <p>Click to Upload Image</p>
              <input 
                ref={fileInputRef}
                id="file-upload" 
                type="file" 
                onChange={handleFileUploadChange}
                style={{ display: 'none' }}
              />
              {uploadedImage && (
                <p className="file-name">
                  {/* Displays if there is an image selected (displays the image name) */}
                  Image added: {uploadedImage.name}
                </p>
              )}
            </div>
          </div>

          {/* Upload button */}
          <button className="upload-button" onClick={handleImageUpload}>
            Upload Image
          </button>
      </div>



        {/* View History Button */}
        <button className="view-history-button" onClick={handleViewHistory}>
          View Upload History
        </button>
    </div>
  );
}

export default ScanProducts;
