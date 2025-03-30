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

  console.log("Sending test response");
  // Return a test response first to check if the API is working
  return res.status(200).json([
    {
      Filename: "test.jpg",
      Author: "Test Author",
      MediaType: "image",
      filter_day: "Monday",
    },
  ]);

  /* Commenting out CSV reading for now
  try {
    // Read the CSV file as text
    const mediaDataPath = path.join(process.cwd(), "media_data.csv");
    const fileContent = await fs.readFile(mediaDataPath, "utf-8");

    // Parse CSV manually (since we can't use streams in serverless)
    const lines = fileContent.split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());

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

    // Send the response
    res.status(200).json(mediaData);
  } catch (error) {
    console.error("Error reading CSV file:", error);
    res
      .status(500)
      .json({ error: "Failed to load media data", details: error.message });
  }
  */
};
