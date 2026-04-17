import React, { useState, useContext } from 'react';
import { toast } from "react-toastify";
import { UserContext } from "../../context/user.context";
// Import components
import BarcodeInputForm from "./components/BarcodeInputForm";
import { UserAllergenInformation, DetectionResult, BarcodeInformation } from "./components/BarcodeResponse";

// Example barcode: 3017624010701
function ScanBarcode() {
  const { currentUser } = useContext(UserContext);
  const user_id = currentUser?.user_id;
  
  // Access user_id from the context
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showBarcodeInfo, setShowBarcodeInfo] = useState('none');
  
  // Scan result: barcode information
  const [barcodeResult, setBarcodeResult] = useState('');
  const [productName, setProductName] = useState('');
  const [barcodeIngredients, setBarcodeIngredients] = useState([]);
  // Scan result: allergen detection
  const [hasAllergen, setHasAllergen] = useState(false);
  const [matchingAllergens, setMatchingAllergens] = useState([]);
  // Scan result: user's allergen information
  const [userAllergen, setUserAllergen] = useState([]);

  const handleFetchResult = (message, toast_function) => {
    toast_function(message, {
      position: "top-center",
      autoClose: true,
      closeOnClick: true,
      style: {
        fontSize: "1.1rem",
        fontWeight: "bold",
        padding: "1.2rem",
        borderRadius: "10px",
        boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
        backgroundColor: "#d1f0ff",
        color: "#0d47a1",
      }
    });
  }

  const handleBarcodeScanning = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`https://localhost:443/api/barcode?code=${barcodeInput}`, {
        method: "POST",
        body: JSON.stringify({ user_id }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBarcodeResult(barcodeInput);
        setProductName(data.product_name);
        setBarcodeIngredients(data.barcode_ingredients);

        setHasAllergen(data.detection_result.hasUserAllergen);
        setMatchingAllergens(data.detection_result.matchingAllergens);

        setUserAllergen(data.user_allergen_ingredients);

        setShowBarcodeInfo('block');
        handleFetchResult("Get barcode data successful!", toast.success);
      } else {
        const data = await response.json();
        setShowBarcodeInfo('none');
        handleFetchResult(data.error || "Failed to fetch data. Please check your input and try again later.", toast.warning);
      }
    } catch (error) {
      console.error("Error fetching data:", error.message);
      setShowBarcodeInfo('none');
      handleFetchResult("Failed to fetch data. An error occurred: " + error.message, toast.error);
    }
  };

  return (
    <div>
      <div className="scan-products-container">
        <h1 className="mt-0 text-left">Enter Barcode Number</h1>
        <BarcodeInputForm value={barcodeInput} handleOnchange={setBarcodeInput} handleSubmit={handleBarcodeScanning} />
      </div>

      {/* Barcode Information */}
      <div className="scan-products-container" style={{ display: showBarcodeInfo }}>
        {/* Allergen information */}
        <UserAllergenInformation isLoggedIn={user_id != undefined} userAllergen={userAllergen} />
        
        {/* Barcode information */}
        <h1 className="mt-0 text-center">Barcode Information</h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DetectionResult isLoggedIn={user_id != undefined} hasAllergen={hasAllergen} matchingAllergens={matchingAllergens} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BarcodeInformation barcodeResult={barcodeResult} productName={productName} barcodeIngredients={barcodeIngredients} />
        </div>
      </div>
    </div>
  );
}

export default ScanBarcode;
