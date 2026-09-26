import React from 'react';

const ApiErrorMessage = ({ error }) => {
  if (!error) return null;

  return (
    <div style={{ padding: '10px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px', color: '#b91c1c', margin: '10px 0' }}>
      <strong>{error.message}</strong>
      {error.details && (
        <div style={{ fontSize: '0.875rem', marginTop: '5px' }}>
          {typeof error.details === 'string' ? error.details : JSON.stringify(error.details)}
        </div>
      )}
    </div>
  );
};

export default ApiErrorMessage;
