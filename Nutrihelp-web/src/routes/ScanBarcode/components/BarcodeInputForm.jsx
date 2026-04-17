function BarcodeInputForm({ value, handleOnchange, handleSubmit } ) {
  return (
    <>
      <div>
        <div>
          <label style={{ color: '#000000', fontsize:'1rem', padding:'1rem'}}>Barcode</label>
          <input
            placeholder="Enter barcode number. Ex: 3017624010701"
            value={value}
            onChange={(e) => handleOnchange(e.target.value)}
          />
        </div>

        <button className="upload-button w-100" onClick={handleSubmit}>
          Get Barcode Information
        </button>
      </div>
    </>
  )
}

export default BarcodeInputForm;