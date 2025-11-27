const jwt = require("jsonwebtoken");
function encryptJson(secretKey) {
  const jsonData1 = { eat: Math.floor(Date.now() / 1000) + 600 };
  const token = jwt.sign(jsonData1, secretKey, { algorithm: "HS256" });
  return token;
}
module.exports = {
  encryptJson,
};
