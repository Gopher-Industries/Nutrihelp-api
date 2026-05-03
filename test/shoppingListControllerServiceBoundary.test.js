const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const { ServiceError } = require('../services/serviceError');

describe('Shopping list controller service boundaries', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('delegates ingredient option lookups to shoppingListService', async () => {
    const shoppingListService = {
      getIngredientOptions: sinon.stub().resolves({
        statusCode: 200,
        body: {
          statusCode: 200,
          message: 'success',
          data: [{ ingredient_name: 'Milk' }]
        }
      })
    };

    const controller = proxyquire('../controller/shoppingListController', {
      '../services/shoppingListService': shoppingListService
    });

    const req = { query: { name: 'Milk' } };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.getIngredientOptions(req, res);

    expect(shoppingListService.getIngredientOptions.calledOnceWith('Milk')).to.equal(true);
    expect(res.status.calledWith(200)).to.equal(true);
    expect(res.json.calledWith({
      statusCode: 200,
      message: 'success',
      data: [{ ingredient_name: 'Milk' }]
    })).to.equal(true);
  });

  it('maps shoppingListService validation failures into stable HTTP responses', async () => {
    const shoppingListService = {
      addShoppingListItem: sinon.stub().rejects(new ServiceError(400, 'Shopping list ID and ingredient name are required'))
    };

    const controller = proxyquire('../controller/shoppingListController', {
      '../services/shoppingListService': shoppingListService
    });

    const req = { body: {} };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    await controller.addShoppingListItem(req, res);

    expect(res.status.calledWith(400)).to.equal(true);
    expect(res.json.calledWith({
      error: 'Shopping list ID and ingredient name are required',
      statusCode: 400
    })).to.equal(true);
  });
});
