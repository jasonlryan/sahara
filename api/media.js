const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const mediaData = [];
  const mediaDataPath = path.join(process.cwd(), "media_data.csv");

  try {
    // Read the CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(mediaDataPath)
        .pipe(csv())
        .on("data", (data) => mediaData.push(data))
        .on("end", resolve)
        .on("error", reject);
    });

    // Send the response
    res.status(200).json(mediaData);
  } catch (error) {
    console.error("Error reading CSV file:", error);
    res.status(500).json({ error: "Failed to load media data" });
  }
};
