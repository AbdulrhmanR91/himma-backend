// Import mongoose package
const mongoose = require("mongoose");

// Create a new mongoose schema instance
const Schema = mongoose.Schema;

// Define the user schema with fields and their types
const userSchema = new Schema({
    // Full name of the user
    fullName: { type: String },

    // Email address of the user
    email: { type: String },

    // Password for the user's account (should be stored securely)
    password: { type: String },

    // Date when the user was created, defaults to the current timestamp
    createdOn: { type: Date, default: new Date().getTime() },
});

// Export the User model based on the userSchema
module.exports = mongoose.model("user", userSchema);