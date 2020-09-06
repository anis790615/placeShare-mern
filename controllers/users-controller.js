const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const User = require("../models/user");
const config = require("../util/config");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (error) {
    return next(new HttpError("Fetching users failed. Try again later", 500));
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};
const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );
  }
  const { name, email, password } = req.body;
  const { path } = req.file;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    return next(new HttpError("Something went wrong. Try again later", 500));
  }

  if (existingUser)
    return next(new HttpError("Cannot create user. User already exists", 422));

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    return next(
      new HttpError("Could not create user. Please, try again.", 500)
    );
  }
  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    image: path,
    places: [],
  });
  try {
    await newUser.save();
  } catch (error) {
    return next(
      new HttpError("Could not save new user to database. Try again later", 500)
    );
  }
  let token;
  try {
    token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
      },
      config.JWT_SECRET,
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(new HttpError("Signin up failed. Try again later", 500));
  }

  res.status(201).json({ userId: newUser.id, email: newUser.id, token });
};
const login = async (req, res, next) => {
  const { email, password } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    return next(new HttpError("Something went wrong. Try again later", 500));
  }

  if (!existingUser) {
    return next(
      new HttpError(
        "Invalid credentials. try again with a different email and/or password",
        403
      )
    );
  }
  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (error) {
    return next(
      new HttpError(
        "Could not log you in. Please, check your credentials and try again.",
        500
      )
    );
  }
  if (!isValidPassword) {
    return next(
      new HttpError(
        "Invalid credentials. try again with a different email and/or password",
        403
      )
    );
  }
  let token;
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        email: existingUser.email,
      },
      config.JWT_SECRET,
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(new HttpError("Login in failed. Try again later", 500));
  }
  res.json({
    userId: existingUser.id,
    email: existingUser.id,
    token,
  });
};

module.exports = {
  getUsers,
  signup,
  login,
};
