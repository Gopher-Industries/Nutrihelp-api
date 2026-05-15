describe('Shared Auth Flow', () => {
  it('logs in successfully', () => {
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: {
        email: 'weeramann@gmail.com',
        password: 'Pass1234@',
      },
    }).then((response) => {
      expect(response.status).to.eq(200);

      expect(response.headers).to.have.property('x-request-id');

      cy.captureRequestId(response);
    });
  });
});
