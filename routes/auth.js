const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
require('dotenv').config()
const User = require("../models/User");

const uploadProfilePicture = require("../middlewares/profilePicture");
const { checkExistingUser } = require("../utils/utils");
const path = require("path");
const isAuthenticated = require("../middlewares/isAuthenticated");

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET;

// Registration Route
router.post("/register", uploadProfilePicture, async (req, res, next) => {
  const { username, password, email, gender, bio } = req.body;
  try {
    if (!username || !password || !email || !gender) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) {
            console.error("Error deleting the file:", err);
          }
        });
      }

      return res.status(400).send({ message: "Enter all the fields" });
    }
    const userExists = await checkExistingUser(username, email);
    if (userExists) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) {
            console.error("Error deleting the file:", err);
          }
        });
      }
      return res
        .status(400)
        .send({ message: "Username or Email is already taken" });
    }

    const user = new User({
      username,
      password,
      email,
      gender,
      bio,
      profilePicture: req.file ? req.file.path : undefined,
    });

    await user.save();
    res.status(201).send({ message: `User ${username.toUpperCase()} created` });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error("Error deleting the file:", err);
        }
      });
    }
    next(error);
  }
});

// Login Route
router.post("/login", async (req, res, next) => {
  const { usernameOrEmail, password } = req.body;
  
  try {
    // Check for missing fields
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: "Please provide both username/email and password." });
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    // Handle case where user is not found
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        gender: user.gender,
        bio : user.bio,
        pfp: user.profilePicture,
      },
      jwtSecret,
      { expiresIn: "1h" }
    );

    // Send token in response
    res.json({ token });

  } catch (error) {
    next(error);
  }
});

router.put('/changePassword/:id',isAuthenticated, async (req, res, next) =>{
  const {oldPassword, newPassword} = req.body;
  const {id} = req.params
  try {
    const updatedUser = await User.findById(id);
    if (!updatedUser) {
      return res.status(400).send({ message: "Invalid Id" });
    }

    const isMatch = await bcrypt.compare(oldPassword, updatedUser.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    updatedUser.password = newPassword;
    await updatedUser.save()
    res.status(200).send({ message: `Password Changed for ${updatedUser.username.toUpperCase()}` });

  } catch (error) {
    
  }
})

router.put("/update/:id",isAuthenticated, uploadProfilePicture, async (req, res, next) => {
  const { username, email, gender, bio } = req.body;
  const { id } = req.params;
  try {
    const updatedUser = await User.findById(id);
    if (!updatedUser) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) {
            console.error("Error deleting the file:", err);
          }
        });
      }
      return res.status(400).send({ message: "Invalid Id" });
    }

    // Check if username or email already exists
    const userExists = await checkExistingUser(username, email);
    if (username != updatedUser.username && userExists) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) {
            console.error("Error deleting the file:", err);
          }
        });
      }
      return res.status(400).send({ message: "Username or Email is already taken" });
    }

    // Update user properties
    updatedUser.username = username ? username : updatedUser.username;
    updatedUser.email = email ? email : updatedUser.email;
    updatedUser.gender = gender ? gender : updatedUser.gender;
    updatedUser.bio = bio ? bio : updatedUser.bio;

    // Handle profile picture update
    if (req.file) {
      if (updatedUser.profilePicture) {
        // Delete the old profile picture
        fs.unlink(path.resolve(updatedUser.profilePicture), (err) => {
          if (err) {
            console.error("Error deleting the old profile picture:", err);
          }
        });
      }
      updatedUser.profilePicture = req.file.path;
    }

    // Save the updated user
    await updatedUser.save();
    res.status(200).send({ message: `${updatedUser.username.toUpperCase()} updated` });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error("Error deleting the file:", err);
        }
      });
    }
    next(error);
  }
});

module.exports = router;
 