Cypress.on('fail', error => {
  const requestId = Cypress.env('lastRequestId');

  if (requestId) {
    error.message += `\n\nRequest ID: ${requestId}`;
  }

  throw error;
});
