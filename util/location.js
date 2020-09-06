const axios = require("axios");
const HttpError = require("../models/http-error");

const config = require("../util/config");

async function getCoordsForAddress(address) {
  const response = await axios.get(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${config.GOOGLE_API_KEY}`
  );
  const { data } = response;
  if (!data || data.status === "ZERO_RESULTS")
    throw new HttpError(
      "Could not find the location for the specified address",
      422
    );
  return data.results[0].geometry.location;
}
module.exports = getCoordsForAddress;
