"use strict";

const mongoose = require("mongoose");

const { MONGODB_URI } = require("./environment");

/**
 * Establishes a connection to MongoDB with retry logic.
 */
const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout after 5s if no server is found
        });

        console.log("MongoDB connected successfully...");

        // Handle graceful shutdown
        process.on("SIGINT", async () => {
            await mongoose.connection.close();
            console.log("MongoDB disconnected due to app termination.");
            process.exit(0);
        });
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        setTimeout(connectDB, 5000); // Retry connection after 5 seconds
    }
};

// Attach event listeners to handle unexpected disconnects
mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB disconnected. Attempting to reconnect...");
    connectDB();
});

module.exports = connectDB;
