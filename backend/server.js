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


// =====================================================
// MONGODB ATLAS
// Explicitly use NewsPulse database
// =====================================================

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


// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
    res.json({
        message: "NewsPulse backend is running"
    });
});


// =====================================================
// ANALYTICS ROUTES
// =====================================================

const analyticsRoutes = require("./routes/analytics");

app.use("/api/analytics", analyticsRoutes);


// =====================================================
// SERVER
// =====================================================

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});