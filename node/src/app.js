const express = require('express');
const connectDB = require('./config/database');
const { PORT } = require('./config/environment');

const app = express();

// Middleware
app.use(express.json());

// Database connection
connectDB();

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});