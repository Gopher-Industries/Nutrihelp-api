import React, { useEffect, useState } from 'react';
import './ScanProducts.css';
import SubHeading from '../../../components/general_components/headings/SubHeading';

function UploadHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const storedHistory = localStorage.getItem('uploadHistory');
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  return (
    <div className="scan-products-container">
      <SubHeading text="Upload History" />
      {history.length === 0 ? (
        <p>No upload history available.</p>
      ) : (
        <ul className="scanned-products-list">
          {history.map((entry, index) => (
            <li key={index}>
              {entry.time} - {entry.imageName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default UploadHistory;
