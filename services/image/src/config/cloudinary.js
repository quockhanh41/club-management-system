const cloudinary = require("cloudinary").v2;
const config = require("./index");

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.get("CLOUDINARY_CLOUD_NAME"),
  api_key: config.get("CLOUDINARY_API_KEY"),
  api_secret: config.get("CLOUDINARY_API_SECRET"),
});

module.exports = cloudinary;
