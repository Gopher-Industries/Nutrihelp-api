const { expect } = require('chai');
const proxyquire = require('proxyquire');

describe('userRepository', () => {
  it('returns null when a user does not exist', async () => {
    const repository = proxyquire('../repositories/userRepository', {
      '../dbConnection': {
        from() {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            maybeSingle() {
              return Promise.resolve({ data: null, error: null });
            }
          };
        }
      }
    });

    const user = await repository.findByEmail('missing@example.com');
    expect(user).to.equal(null);
  });

  it('wraps database failures in a RepositoryError', async () => {
    const repository = proxyquire('../repositories/userRepository', {
      '../dbConnection': {
        from() {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            maybeSingle() {
              return Promise.resolve({ data: null, error: new Error('db failed') });
            }
          };
        }
      }
    });

    let caughtError = null;

    try {
      await repository.findByEmail('broken@example.com');
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).to.be.an('error');
    expect(caughtError.name).to.equal('RepositoryError');
    expect(caughtError.message).to.equal('Failed to load user by email');
    expect(caughtError.cause).to.be.an('error');
    expect(caughtError.cause.message).to.equal('db failed');
  });
});
