const express = require("express");
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");
const cors = require("cors");

const app = express();
const port = 3000;

const mediaDataPath = "media_data.csv";
const mediaData = [];

// --- Middleware ---
app.use(cors()); // Enable CORS for all origins

// --- Serve Static Files ---
// Allows accessing files like http://localhost:3000/media/original.jpg
app.use("/media", express.static(path.join(__dirname, "media")));
// Allows accessing files like http://localhost:3000/web_media/800/resized.jpg
app.use("/web_media", express.static(path.join(__dirname, "web_media")));

// --- API Endpoint ---
app.get("/api/media", (req, res) => {
  // Send the loaded media data as JSON
  res.json(mediaData);
});

// --- Read CSV Data and Start Server ---
const startServer = () => {
  fs.createReadStream(mediaDataPath)
    .pipe(csv())
    .on("data", (data) => mediaData.push(data))
    .on("end", () => {
      console.log("CSV data loaded successfully.");
      app.listen(port, () => {
        console.log(`Backend API server running at http://localhost:${port}`);
      });
    })
    .on("error", (error) => {
      console.error("Error reading CSV file:", error);
      process.exit(1); // Exit if CSV can't be read (current behavior)
    });
};

// Basic error handling for server startup issues
app.on("error", (error) => {
  console.error("Server error:", error);
});

startServer(); // Call the function to start the process
