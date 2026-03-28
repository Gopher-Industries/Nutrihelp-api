import React, { useState } from 'react';
import ScanBarcode from './ScanBarcode';
import ScanProducts from '../UI-Only-Pages/ScanProducts/ScanProducts';
import '../UI-Only-Pages/ScanProducts/ScanProducts.css';

function Scan() {
  // State for scan method selection
  const [scanMethod, setScanMethod] = useState('barcode'); // 'barcode' or 'image'

  return (
    <div className="scan-products-page">
      {/* Not totally necessary <h1 className="scanHead" >Scan</h1> */}
      <div className="scan-products-container">
        <h2 className="text-center" style={{ fontSize: '1rem', marginBottom: '1.5rem', textAlign:'left' }}>Choose Scan Method</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
          <button 
            className={`scan-button-selector`}
            onClick={() => setScanMethod('image')}
          >
            Scan by Product Image
          </button>
          <button 
            className={`scan-button-selector`}
            onClick={() => setScanMethod('barcode')}
          >
            Scan by Barcode
          </button>
        </div>
      </div>

      {/* Product Image Scan Section */}
      {scanMethod === 'image' && (
          <ScanProducts/>
      )}

      {/* Barcode Scan Section */}
      {scanMethod === 'barcode' && (
          <ScanBarcode/>
      )}

      <div className="mainContainer" style={{ maxWidth: '900px', width: '100%', margin: '2rem auto' }}>
        <span className="guideHead"><b>How to use:</b></span>
        <ul className="stepContainer">
          <li className="steps"><b>Product Image:</b> Take a clear photo of the product and fill in the details.</li>
          <li className="steps"><b>Barcode:</b> Type in the numbers shown below the barcode lines.</li>
        </ul>
      </div>
    </div>
  );
}

export default Scan;