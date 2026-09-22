const sharp = require('sharp');

let chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk));
process.stdin.on('end', async () => {
  try {
    const output = await sharp(Buffer.concat(chunks)).toBuffer();
    process.stdout.write(output);
    process.exit(0);
  } catch (err) {
    process.stderr.write(err.message);
    process.exit(1);
  }
});