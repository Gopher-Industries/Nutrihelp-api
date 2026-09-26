const { expect } = require('chai');
const crypto = require('crypto');

const ENCRYPTION_MODULE_PATH = '../utils/encryption';

function loadEncryptionModule() {
  delete require.cache[require.resolve(ENCRYPTION_MODULE_PATH)];
  return require(ENCRYPTION_MODULE_PATH);
}

describe('utils/encryption', () => {
  const originalEncryptionKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  });

  afterEach(() => {
    if (originalEncryptionKey === undefined) {
      delete process.env.ENCRYPTION_KEY;
    } else {
      process.env.ENCRYPTION_KEY = originalEncryptionKey;
    }
    delete require.cache[require.resolve(ENCRYPTION_MODULE_PATH)];
  });

  it('decrypts values encrypted by the same key', () => {
    const { encrypt, decrypt } = loadEncryptionModule();
    const encrypted = encrypt('sensitive-value');

    expect(decrypt(encrypted)).to.equal('sensitive-value');
  });

  it('throws when decrypting with the wrong key', () => {
    const { encrypt } = loadEncryptionModule();
    const encrypted = encrypt('sensitive-value');

    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    const { decrypt } = loadEncryptionModule();

    expect(() => decrypt(encrypted)).to.throw('Decryption failed:');
  });

  it('throws when the encrypted payload is malformed', () => {
    const { decrypt } = loadEncryptionModule();

    expect(() => decrypt('abcd:1234')).to.throw('Encrypted payload is malformed.');
  });
});
