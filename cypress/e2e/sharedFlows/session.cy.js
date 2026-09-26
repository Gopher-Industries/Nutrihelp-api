describe('Protected Session Flow', () => {
  beforeEach(() => {
    cy.login();
  });

  it('loads authenticated profile', () => {
    cy.request({
      method: 'GET',
      url: '/api/account',
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem('token')}`,
      },
    }).then((response) => {
      expect(response.status).to.eq(200);

      cy.captureRequestId(response);
    });
  });
});
