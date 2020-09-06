const mongoose = require("mongoose");
const HttpError = require("../models/http-error");

const connectDb = async (config) => {
  try {
    await mongoose.connect(
      `mongodb+srv://${config.MONGO_USER}:${config.MONGO_PWD}@anistation.mxt3x.azure.mongodb.net/${config.MONGO_DB}?retryWrites=true&w=majority`,
      { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true }
    );
    console.log("Connected to database");
  } catch (error) {
    throw new HttpError(error.message, 500);
  }
};
module.exports = connectDb;
