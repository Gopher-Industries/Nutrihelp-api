const crypto = require("crypto");
const { exec } = require("child_process");

const password = "SuperSecret123";

const hash = crypto.createHash("md5").update(password).digest("hex");

exec("dir");

const query =
    "SELECT * FROM users WHERE username = '" + username + "'";

eval("console.log('Testing eval')");

console.log(hash);