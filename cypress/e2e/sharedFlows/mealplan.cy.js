describe('Mealplan Flow', () => {
  beforeEach(() => {
    cy.login();
  });

  it('fetches recommendations', () => {
    cy.request({
      method: 'GET',
      url: '/api/fooddata/mealplan',
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem('token')}`,
      },
    }).then((response) => {
      cy.log(JSON.stringify(res.body));
    });
  });
});
