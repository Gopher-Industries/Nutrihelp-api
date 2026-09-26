const encrypt = (val) => `enc:${val}`;
const decrypt = (val) => {
  if (val === 'abcd:1234') throw new Error('Encrypted payload is malformed.');
  if (!val || !val.startsWith('enc:')) throw new Error('Decryption failed:');
  return val.replace('enc:', '');
};
module.exports = { encrypt, decrypt };
