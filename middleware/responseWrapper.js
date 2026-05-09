module.exports = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    // If it's already a string, try parsing it to check if it's already wrapped
    let parsedData = data;
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        // Not JSON string, continue
      }
    }

    // Check if it's already wrapped in { success, data } or { success, error }
    const isWrapped = parsedData && typeof parsedData === 'object' && 
                     (parsedData.hasOwnProperty('success') && 
                     (parsedData.hasOwnProperty('data') || parsedData.hasOwnProperty('error')));

    if (isWrapped) {
      return originalSend.call(this, typeof data === 'string' ? data : JSON.stringify(data));
    }

    // Wrap plain object/array/string
    const envelope = {
      success: res.statusCode < 400,
      data: parsedData
    };

    return originalSend.call(this, JSON.stringify(envelope));
  };

  next();
};
