Cypress.Commands.add('login', () => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: {
      email: 'weeramann@gmail.com',
      password: 'Pass1234@',
    },
  }).then((response) => {
    expect(response.status).to.eq(200);

    // Save token if backend returns one
    const token = response.body?.token || response.body?.accessToken;

    if (token) {
      window.localStorage.setItem('token', token);
    }

    // Save request ID for tracing/debugging
    const requestId = response.headers['x-request-id'];

    if (requestId) {
      Cypress.env('requestId', requestId);
      cy.log(`Request ID: ${requestId}`);
    }
  });
});
