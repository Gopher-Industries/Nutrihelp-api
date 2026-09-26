import './commands';

Cypress.Commands.add('captureRequestId', (response) => {
  const requestId = response.headers['x-request-id'];

  if (requestId) {
    cy.log(`Request ID: ${requestId}`);

    Cypress.env('lastRequestId', requestId);
  }
});
