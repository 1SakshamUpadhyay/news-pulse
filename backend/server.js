const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "../.env")
});

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    dbName: "NewsPulse"
})
.then(() => {
    console.log("MongoDB Atlas connected!");
    console.log("Using database: NewsPulse");
})
.catch((err) => {
    console.error("MongoDB connection failed:", err.message);
});

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "NewsPulse backend is running"
    });
});

// Analytics routes
const analyticsRoutes = require("./routes/analytics");
app.use("/api/analytics", analyticsRoutes);

// Render provides PORT automatically
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});