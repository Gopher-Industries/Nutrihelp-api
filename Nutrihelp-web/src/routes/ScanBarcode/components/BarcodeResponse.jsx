export const UserAllergenInformation = ({ isLoggedIn, userAllergen }) => {
  if (!isLoggedIn) {
    return;
  }

  if (userAllergen.length > 0) {
    return (
      <>
        <h1 className="mt-0 text-center">Allergen Information</h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}> 
          <div className="text-center pt-2 px-3 mb-3" style={{ width: '80%', border: '2px solid #e0e0e0' }}>
            <p style={{ fontWeight: "bold" }}>Allergen ingredients detected in your profile</p>
            <p>{ userAllergen.join(", ")} </p>
          </div>
        </div>
      </>
    )
  } else {
    return (
      <>
        <h1 className="mt-0 text-center">Allergen Information</h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}> 
          <div className="text-center pt-2 px-3 mb-3" style={{ width: '80%', border: '2px solid #e0e0e0' }}>
            <p>You have not specified any allergen ingredients.</p>
          </div>
        </div>
      </>
    )
  } 
}

export const DetectionResult = ({ isLoggedIn, hasAllergen, matchingAllergens }) => {
  if (!isLoggedIn) {
    return;
  }

  if (!hasAllergen) {
    return <p style={{ color: '#50C878' }}>Safe to use - no allergens detected</p>;
  } else {
    return (
      <>
        <div className="text-center" style={{ color: '#FF0000' }}>
          <p>
            Allergen detected! This product contains ingredients from your allergy list
          </p>
          <p style={{ fontWeight: "bold" }}>{matchingAllergens.join(", ")}</p>
        </div>
      </>
    );
  }
}

export const BarcodeInformation = ({ barcodeResult, productName, barcodeIngredients }) => {
  return (
    <>
      <table cellPadding={10} style={{ width: '80%', fontSize: '1.2rem', margin: '1rem',}}>
        <tbody>
          <tr>
            <th>Code</th>
            <td>{barcodeResult}</td>
          </tr>
          <tr>
            <th>Product</th>
            <td>{productName}</td>
          </tr>
          
          <tr>
            <th rowSpan={barcodeIngredients.length + 1}>Ingredients</th>
          </tr>
          {barcodeIngredients.map((ingredient, index) => (
            <tr key={index}>
              <td style={{ padding: 6, borderBottom: '1px solid #f0f0f0' }}>{index + 1}. {ingredient}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}