const mongoose = require("mongoose");
const User = require("../models/User");

async function connectDB(url) {
  try {
    await mongoose.connect(url);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
  }
}

async function checkExistingUser(username, email) {
  try {
    const existingUsername = await User.findOne({ username });
    const existingEmail = await User.findOne({ email });
    return existingUsername || existingEmail ? true : false;
  } catch (err) {
    console.error('Error checking existing user:', err.message);
    throw err; // Propagate the error so it can be handled by the calling function
  }
}

module.exports = { connectDB, checkExistingUser };
