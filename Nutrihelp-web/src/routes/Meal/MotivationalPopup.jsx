import React, { useEffect, useState } from 'react';
import './MotivationalPopup.css';

const importAllImages = (requireContext) => {
    return requireContext.keys().map(requireContext);
};

const images = importAllImages(require.context('/src/images/motivational_img', false, /\.jpg$/));

const MotivationalPopup = ({ onClose }) => {
    const quotes = [
        "Every bite is a step towards a healthier you.",
        "Small changes make a big difference.",
        "Eat well, live strong.",
        "Healthy food, happy mood.",
        "Choose health, choose happiness.",
        "Every meal is a choice for wellness.",
        "Healthy eating, endless energy.",
        "Good food fuels great days.",
        "A healthy outside starts from the inside."
    ];

    const [quote, setQuote] = useState("");
    const [image, setImage] = useState("");

    useEffect(() => {
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
        setImage(images[Math.floor(Math.random() * images.length)]);

        const timer = setTimeout(() => {
            onClose();
        }, 2500);

        return () => clearTimeout(timer); 
    }, [onClose]);

    return (
        <div className="popup-overlay">
            <div className="popup-container">
                <div className="popup-image" style={{ backgroundImage: `url(${image})` }}></div>
                
                <div className="popup-text">{quote}</div>
            </div>
        </div>
    );
};

export default MotivationalPopup;