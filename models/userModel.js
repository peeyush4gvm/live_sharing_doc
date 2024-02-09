const mongoose = require('mongoose');

// Define the user schema
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
});

// Create the User model
const User = mongoose.model('User', userSchema);

// Export the User model
module.exports = User;
