// Import mongoose package
const mongoose = require("mongoose");

// Create a new mongoose schema instance
const Schema = mongoose.Schema;

// Define the note schema with fields and their types
const noteSchema = new Schema({
    // Title of the note, required field
    title: { type: String, required: true },

    // Content of the note, required field
    content: { type: String, required: true },

    // Array of tags for the note, defaults to an empty array
    tags: { type: [String], default: [] },

    // Boolean indicating whether the note is pinned, defaults to false
    isPinned: { type: Boolean, default: false },

    // Status of the note, can be one of 'pending', 'in progress', or 'completed', required field
    status: { type: String, enum: ['pending', 'in progress', 'completed'], required: true },

    // User ID of the note's creator, required field
    userId: { type: String, required: true },

    // Date when the note was created, defaults to the current timestamp
    createdOn: { type: Date, default: new Date().getTime() },
});

// Export the Note model based on the noteSchema
module.exports = mongoose.model("Note", noteSchema);
