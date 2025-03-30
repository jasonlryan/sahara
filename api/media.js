const fs = require("fs").promises;
const path = require("path");

module.exports = async (req, res) => {
  console.log("API endpoint hit:", req.url);
  console.log("Request method:", req.method);
  console.log("Request headers:", req.headers);

  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    res.status(200).end();
    return;
  }

  try {
    // Read the CSV file as text
    const mediaDataPath = path.join(process.cwd(), "media_data.csv");
    console.log("Reading CSV from:", mediaDataPath);

    const fileContent = await fs.readFile(mediaDataPath, "utf-8");
    console.log("CSV file read successfully");

    // Parse CSV manually
    const lines = fileContent.split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    console.log("CSV Headers:", headers);

    const mediaData = lines
      .slice(1)
      .filter((line) => line.trim()) // Skip empty lines
      .map((line) => {
        const values = line.split(",");
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index] ? values[index].trim() : "";
          return obj;
        }, {});
      });

    console.log(`Parsed ${mediaData.length} items from CSV`);
    // Send the response
    res.status(200).json(mediaData);
  } catch (error) {
    console.error("Error reading CSV file:", error);
    res.status(500).json({
      error: "Failed to load media data",
      details: error.message,
      path: path.join(process.cwd(), "media_data.csv"),
    });
  }
};
