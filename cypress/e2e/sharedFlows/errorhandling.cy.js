describe('Error Handling', () => {
  it('returns request ID on failures', () => {
    cy.request({
      method: 'GET',
      url: '/api/auth/profile',
      failOnStatusCode: false,
    }).then(response => {
      expect(response.status).to.eq(401);

      expect(response.headers).to.have.property('x-request-id');

      cy.captureRequestId(response);
    });
  });
});
