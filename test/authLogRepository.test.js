const { expect } = require('chai');
const proxyquire = require('proxyquire');

describe('authLogRepository', () => {
  it('returns a failure count from brute force logs', async () => {
    const repository = proxyquire('../repositories/authLogRepository', {
      '../dbConnection': {
        from() {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            gte() {
              return Promise.resolve({
                data: [{ id: 1 }, { id: 2 }, { id: 3 }],
                error: null
              });
            }
          };
        }
      }
    });

    const count = await repository.countRecentBruteForceFailuresByEmail(
      'user@example.com',
      '2026-03-27T00:00:00.000Z'
    );

    expect(count).to.equal(3);
  });

  it('wraps insert failures in a RepositoryError', async () => {
    const repository = proxyquire('../repositories/authLogRepository', {
      '../dbConnection': {
        from() {
          return {
            insert() {
              return {
                select() {
                  return {
                    maybeSingle() {
                      return Promise.resolve({
                        data: null,
                        error: new Error('insert failed')
                      });
                    }
                  };
                }
              };
            }
          };
        }
      }
    });

    let caughtError = null;

    try {
      await repository.insertAuthAttempt({
        email: 'user@example.com',
        success: false,
        ipAddress: '127.0.0.1',
        createdAt: '2026-03-27T00:00:00.000Z'
      });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).to.be.an('error');
    expect(caughtError.name).to.equal('RepositoryError');
    expect(caughtError.message).to.equal('Failed to insert auth attempt');
    expect(caughtError.cause.message).to.equal('insert failed');
  });
});
