class RepositoryError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'RepositoryError';
    this.code = options.code || 'REPOSITORY_ERROR';
    this.cause = options.cause || null;
    this.metadata = options.metadata || {};
  }
}

function wrapRepositoryError(message, cause, metadata = {}) {
  if (cause instanceof RepositoryError) {
    return cause;
  }

  return new RepositoryError(message, {
    cause,
    metadata
  });
}

module.exports = {
  RepositoryError,
  wrapRepositoryError
};
