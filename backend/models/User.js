const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      select: false, // don't return password in find() by default
    },
    role: {
      type: String,
      enum: {
        values: ['student', 'alumni', 'faculty'],
        message: '{VALUE} is not a valid role',
      },
      required: [true, 'Please provide a role'],
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
