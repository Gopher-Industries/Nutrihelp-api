describe('Preferences Flow', () => {
  beforeEach(() => {
    cy.login();
  });

  it('updates preferences safely', () => {
    cy.request({
      method: 'POST',
      url: '/api/user/preferences',
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem('token')}`,
      },
      body: {
        dietary_requirements: [1, 2, 4],
        allergies: [1],
        cuisines: [2, 5],
        dislikes: [4],
        health_conditions: [],
        spice_levels: [1, 2],
        cooking_methods: [1, 4, 5],
      },
    }).then((response) => {
      expect(response.status).to.eq(200);

      cy.captureRequestId(response);
    });
  });
});
