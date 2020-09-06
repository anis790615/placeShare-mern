const dotenv = require("dotenv");

dotenv.config();
const config = {
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  MONGO_USER: process.env.MONGO_USER,
  MONGO_PWD: process.env.MONGO_PWD,
  MONGO_DB: process.env.MONGO_DB,
  JWT_SECRET: process.env.JWT_SECRET,
};
module.exports = config;
