const mongoose = require("mongoose");
const fs = require("fs");
const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (error) {
    return next(new HttpError("Something went wrong", 500));
  }
  if (!place) {
    return next(
      new HttpError("Could not find a place for the provided id", 404)
    );
  }
  res.json({ place: place.toObject({ getters: true }) });
};
const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let userPlaces;
  try {
    userPlaces = await Place.find({ creator: userId });
  } catch (error) {
    return next(new HttpError("Fetching places failed. Try again later.", 500));
  }

  if (!userPlaces || userPlaces.length <= 0) {
    return next(
      new HttpError("Could not find places for the provided user id", 404)
    );
  }
  res.json({
    places: userPlaces.map((userPlace) =>
      userPlace.toObject({ getters: true })
    ),
  });
};
const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new HttpError("Invalid inputs passed, please check your data", 422);
  }
  const placeId = req.params.pid;
  const { title, description } = req.body;
  let updatedPlace;
  try {
    updatedPlace = await Place.findById(placeId);
  } catch (error) {
    return next(new HttpError("Fetching places failed. Try again later.", 500));
  }
  if (!updatedPlace) {
    return next(
      new HttpError("Could not find a place for the provided id", 404)
    );
  }
  if (updatedPlace.creator.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to edit this place.", 401));
  }
  updatedPlace.title = title;
  updatedPlace.description = description;
  try {
    await updatedPlace.save();
  } catch (error) {
    return next(
      new HttpError("Something went wrong. Could not update database", 500)
    );
  }
  res.status(200).json({ place: updatedPlace.toObject({ getters: true }) });
};
const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  let deletedPlace;
  try {
    deletedPlace = await Place.findById(placeId).populate("creator");
  } catch (error) {
    return next(new HttpError("Fetching places failed. Try again later.", 500));
  }
  if (!deletedPlace) {
    return next(new HttpError("No place with such id", 404));
  }
  if (deletedPlace.creator.id !== req.userData.userId) {
    return next(
      new HttpError("You are not allowed to delete this place.", 401)
    );
  }
  const imagePath = deletedPlace.image;
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await deletedPlace.remove({ session });
    deletedPlace.creator.places.pull(deletedPlace);
    await deletedPlace.creator.save({ session });
    await session.commitTransaction();
  } catch (error) {
    return next(
      new HttpError(
        "Something went wrong. Could not delete place. Try again later.",
        500
      )
    );
  }
  fs.unlink(imagePath, (err) => {
    console.log(err);
  });
  res.status(200).json({ message: "Place deleted successfully" });
};
const postPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );
  }
  const { title, description, address } = req.body;
  const { path } = req.file;
  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }
  const newPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: path,
    creator: req.userData.userId,
  });
  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (error) {
    return next(new HttpError("Creating place failed. Try again.", 500));
  }

  if (!user) {
    return next(new HttpError("Could not find user for provided id", 404));
  }
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await newPlace.save({ session });
    user.places.push(newPlace);
    await user.save({ session });
    await session.commitTransaction();
  } catch (error) {
    return next(new HttpError("Creating place failed. Try again.", 500));
  }

  res.status(201).json({ place: newPlace });
};

module.exports = {
  getPlaceById,
  getPlacesByUserId,
  postPlace,
  updatePlace,
  deletePlace,
};
