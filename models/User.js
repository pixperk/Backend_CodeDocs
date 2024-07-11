const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  profilePicture: {
    type: String,
    default: 'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_1280.png', // Default profile picture URL
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer not to say'],
    required: true,
  },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String },
  githubId: { type: String, unique: true, sparse: true },
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
