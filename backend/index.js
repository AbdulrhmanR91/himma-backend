// Load environment variables from .env file
require("dotenv").config(); // This loads environment variables from a .env file

// Import required modules
const config = require("./config.json"); // Importing configuration from a JSON file
const mongoose = require("mongoose"); // Importing mongoose for MongoDB interactions

// Connect to MongoDB using the connection string from config
mongoose.connect(config.connectionString); // Connecting to the database with the provided connection string

// Import the User and Note models
const User = require("./models/user.model"); // Importing User model for user-related operations
const Note = require("./models/note.model"); // Importing Note model for note-related operations

// Initialize Express app and set up middleware
const express = require("express"); // Importing express for creating the server
const cors = require("cors"); // Importing CORS middleware for cross-origin requests
const app = express(); // Initializing the Express app

const jwt = require("jsonwebtoken"); // Importing JWT for token management
const { authenticateToken } = require("./utilites"); // Importing custom middleware for token authentication

// Middleware to parse incoming JSON requests
app.use(express.json()); // This middleware allows Express to parse JSON request bodies

// Enable CORS for all origins
app.use(
    cors({
        origin: "*", // Allowing requests from any origin
    })
);

// Default route to check if backend is running
app.get("/", (req, res) => {
    res.json({ data: "hello" }); // Responding with a simple JSON message
});

// Create Account route
app.post("/create-account", async (req, res) => {
    const { fullName, email, password } = req.body; // Destructuring request body to extract user details

    // Check if required fields are provided
    if (!fullName) {
        return res.status(400).json({ error: true, message: "Full Name is required" });
    }
    if (!email) {
        return res.status(400).json({ error: true, message: "Email is required" });
    }
    if (!password) {
        return res.status(400).json({ error: true, message: "Password is required" });
    }

    // Check if user already exists by email
    const isUser = await User.findOne({ email: email }); // Searching for user by email
    if (isUser) {
        return res.json({ error: true, message: "User already exists" }); // Returning error if user exists
    }

    // Create a new user and save it in the database
    const user = new User({
        fullName,
        email,
        password,
    });
    await user.save(); // Saving new user to the database

    // Generate an access token for the new user
    const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "36000m", // Token expiration time
    });

    return res.json({
        error: false,
        user,
        accessToken,
        message: "Registration Successful",
    });
});

// Login route
app.post("/login", async (req, res) => {
    const { email, password } = req.body; // Destructuring request body to extract login details

    // Check if email and password are provided
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    if (!password) {
        return res.status(400).json({ message: "Password is required" });
    }

    // Find user by email
    const userInfo = await User.findOne({ email: email }); // Searching for user by email
    if (!userInfo) {
        return res.status(400).json({ message: "User not found" }); // Returning error if user not found
    }

    // Validate credentials
    if (userInfo.email === email && userInfo.password === password) {
        const user = { user: userInfo }; // Creating user object for JWT
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "3600m", // Token expiration time
        });

        return res.json({
            error: false,
            message: "Login successful",
            email,
            accessToken, // Returning access token on successful login
        });
    } else {
        return res.status(400).json({ error: true, message: "Invalid credentials" }); // Returning error for invalid credentials
    }
});

// Get user details route (protected by authentication)
app.get("/get-user", authenticateToken, async (req, res) => {
    const { user } = req.user; // Extracting user from authenticated token
    
    // Find user by ID
    const isUser = await User.findOne({ _id: user._id }); // Searching for user by ID

    // If user is not found, return unauthorized status
    if (!isUser) {
        return res.sendStatus(401); // Returning unauthorized status if user not found
    }

    // Return user details
    return res.json({
        user: {
            fullName: isUser.fullName,
            email: isUser.email,
            _id: isUser._id,
            createdOn: isUser.createdOn,
        },
        message: "",
    });
});

// Add Note route (protected by authentication)
app.post("/add-note", authenticateToken, async (req, res) => {
    const { title, content, tags, status } = req.body; // Destructuring request body to extract note details
    const { user } = req.user; // Extracting user from authenticated token

    // Check if title and content are provided
    if (!title) {
        return res.status(400).json({ error: true, message: "Title is required!" });
    }
    if (!content) {
        return res.status(400).json({ error: true, message: "Content is required" });
    }

    // Validate status value
    if (status && !['pending', 'in progress', 'completed'].includes(status)) {
        return res.status(400).json({ error: true, message: "Invalid status value" });
    }

    try {
        // Create new note and save it in the database
        const note = new Note({
            title,
            content,
            tags: tags || [], // Default to empty array if no tags are provided
            status: status || "pending", // Default to "pending" if no status is provided
            userId: user._id, // Associating note with the user ID
        });

        await note.save(); // Saving note to the database

        return res.json({
            error: false,
            note,
            message: "Note added successfully",
        });
    } catch (error) {
        return res.status(500).json({ error: true, message: "Internal Server Error" }); // Handling server errors
    }
});

// Edit Note route (protected by authentication)
app.put("/edit-note/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId; // Extracting note ID from request parameters
    const { title, content, tags, isPinned, status } = req.body; // Destructuring request body for potential updates
    const { user } = req.user; // Extracting user from authenticated token

    // Check if any changes are provided
    if (!title && !content && !tags) {
        return res.status(400).json({ error: true, message: "No changes provided" });
    }

    // Validate status value
    if (status && !['pending', 'in progress', 'completed'].includes(status)) {
        return res.status(400).json({ error: true, message: "Invalid status value" });
    }

    try {
        // Find the note by noteId and userId
        const note = await Note.findOne({ _id: noteId, userId: user._id });

        if (!note) {
            return res.status(404).json({ error: true, message: "Note not found" }); // Returning error if note not found
        }

        // Update note fields if changes are provided
        if (title) note.title = title; // Updating title if provided
        if (content) note.content = content; // Updating content if provided
        if (tags) note.tags = tags; // Updating tags if provided
        if (isPinned !== undefined) note.isPinned = isPinned; // Updating pinned status if provided
        if (status) note.status = status; // Updating status if provided

        await note.save(); // Saving updated note to the database

        return res.json({
            error: false,
            note,
            message: "Note updated successfully",
        });
    } catch (error) {
        return res.status(500).json({ error: true, message: "Internal Server Error" }); // Handling server errors
    }
});

// Get all notes route (protected by authentication)
app.get("/get-all-notes/", authenticateToken, async (req, res) => {
    const { user } = req.user; // Extracting user from authenticated token

    try {
        // Retrieve all notes for the user, sorted by pinned status
        const notes = await Note.find({ userId: user._id }).sort({ isPinned: -1 }); // Sorting notes by pinned status

        return res.json({
            error: false,
            notes,
            message: "All notes retrieved successfully",
        });
    } catch (error) {
        return res.status(500).json({ error: true, message: "Internal Server Error" }); // Handling server errors
    }
});

// Delete Note route (protected by authentication)
app.delete("/delete-note/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId; // Extracting note ID from request parameters
    const { user } = req.user; // Extracting user from authenticated token

    try {
        // Find the note by noteId and userId and delete it
        const note = await Note.findOneAndDelete({ _id: noteId, userId: user._id });

        if (!note) {
            return res.status(404).json({ error: true, message: "Note not found" }); // Returning error if note not found
        }

        return res.json({
            error: false,
            message: "Note deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({ error: true, message: "Internal Server Error" }); // Handling server errors
    }
});

// Search Notes by Title or Content route (protected by authentication)
app.get("/search-notes/", authenticateToken, async (req, res) => {
    const { user } = req.user; // Extracting user from authenticated token
    const { query } = req.query; // Extracting search query from request parameters

    // Check if search query is provided
    if (!query) {
        return res.status(400).json({ error: true, message: "Search query is required" });
    }

    try {
        // Search for notes that match the title or content
        const matchingNotes = await Note.find({
            userId: user._id,
            $or: [
                { title: { $regex: new RegExp(query, "i") } },
                { content: { $regex: new RegExp(query, "i") } },
            ],
        });

        return res.json({
            error: false,
            notes: matchingNotes,
            message: "Notes matching the search query retrieved successfully",
        });
    } catch (error) {
        return res.status(500).json({ error: true, message: "Internal Server Error" }); // Handling server errors
    }
});

// Search Notes by Tags route (protected by authentication)
app.get("/search-notes-by-tags/", authenticateToken, async (req, res) => {
    const { user } = req.user; // Extracting user from authenticated token
    const { tags } = req.query; // Extracting tags from request parameters

    // Check if tags are provided
    if (!tags) {
        return res.status(400).json({ error: true, message: "Tags are required for search" });
    }

    try {
        // Convert tags string to array and trim whitespace
        const tagArray = tags.split(',').map(tag => tag.trim()); // Splitting tags into an array

        // Find notes that match any of the provided tags
        const matchingNotes = await Note.find({
            userId: user._id,
            tags: { $in: tagArray }, // Matching notes with any of the provided tags
        }).sort({ isPinned: -1 }); // Sorting notes by pinned status

        return res.json({
            error: false,
            notes: matchingNotes,
            message: "Notes matching the tags retrieved successfully",
        });
    } catch (error) {
        return res.status(500).json({ error: true, message: "Internal Server Error" }); // Handling server errors
    }
});

// Update Note Status route (protected by authentication)
app.put("/update-note-status/:noteId", authenticateToken, async (req, res) => {
    const noteId = req.params.noteId; // Extracting note ID from request parameters
    const { status } = req.body; // Destructuring request body to extract new status
    const { user } = req.user; // Extracting user from authenticated token

    // Validate status value
    if (!['pending', 'in progress', 'completed'].includes(status)) {
        return res.status(400).json({ error: true, message: "Invalid status value" });
    }

    try {
        // Find the note by noteId and userId
        const note = await Note.findOne({ _id: noteId, userId: user._id });

        if (!note) {
            return res.status(404).json({ error: true, message: "Note not found" }); // Returning error if note not found
        }

        // Update the status of the note
        note.status = status; // Updating status
        await note.save(); // Saving updated note to the database

        return res.json({
            error: false,
            note,
            message: "Note status updated successfully",
        });
    } catch (error) {
        return res.status(500).json({ error: true, message: "Internal Server Error" }); // Handling server errors
    }
});

// Search Notes by Status route (protected by authentication)
app.get("/search-notes-by-status/", authenticateToken, async (req, res) => {
    const { user } = req.user; // Extracting user from authenticated token
    const { status } = req.query; // Extracting status from request parameters

    // Check if valid status is provided
    if (!status || !['pending', 'in progress', 'completed'].includes(status.toLowerCase())) {
        return res.status(400).json({ error: true, message: "Valid status is required for search" });
    }

    try {
        // Find notes that match the provided status
        const matchingNotes = await Note.find({
            userId: user._id,
            status: status.toLowerCase(), // Matching notes with the provided status
        }).sort({ isPinned: -1 }); // Sorting notes by pinned status

        return res.json({
            error: false,
            notes: matchingNotes,
            message: "Notes matching the status retrieved successfully",
        });
    } catch (error) {
        return res.status(500).json({ error: true, message: "Internal Server Error" }); // Handling server errors
    }
});

// Start the Express server on port 8000
app.listen(8000, () => {
    console.log("Server is running on port 8000"); // Logging to console when server starts
});

// Exporting app for potential testing or other purposes
module.exports = app; 