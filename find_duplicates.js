const fs = require("fs");
const path = require("path");
const { imageHash } = require("image-hash");
const util = require("util");

// Promisify imageHash
const getImageHash = util.promisify(imageHash);

// Directory containing the images
const imageDir = path.join(__dirname, "web_media/400");
// Output file for results
const outputFile = path.join(__dirname, "duplicate_analysis.md");

// Function to extract author from filename
function getAuthor(filename) {
  const parts = filename.split(".");
  return parts[0];
}

// Function to extract timestamp from filename
function getTimestamp(filename) {
  const timestampMatch = filename.match(
    /(\d{4}-\d{2}-\d{2}\s+at\s+\d{2}\.\d{2}\.\d{2})/
  );
  return timestampMatch ? timestampMatch[1] : "";
}

// Hamming distance to measure similarity between hashes
function hammingDistance(hash1, hash2) {
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
}

// Find duplicates based on image hashing
async function findDuplicates() {
  try {
    // Create output stream for the results file
    const outputStream = fs.createWriteStream(outputFile);

    // Function to write to both console and file
    function log(message) {
      console.log(message);
      outputStream.write(message + "\n");
    }

    // Get all jpeg files in the directory
    const files = fs
      .readdirSync(imageDir)
      .filter((file) => file.toLowerCase().endsWith(".jpeg"));

    log(`Analyzing ${files.length} images...`);

    // Generate hash for each image
    const imageData = [];
    for (const file of files) {
      try {
        const filePath = path.join(imageDir, file);
        const hash = await getImageHash(filePath, 16, true);

        imageData.push({
          file,
          author: getAuthor(file),
          timestamp: getTimestamp(file),
          hash,
        });

        // Optional: Show progress
        if (imageData.length % 50 === 0) {
          console.log(
            `Processed ${imageData.length}/${files.length} images...`
          );
        }
      } catch (err) {
        console.error(`Error hashing ${file}:`, err.message);
      }
    }

    log(`Generated hashes for ${imageData.length} images.`);

    // Find duplicate pairs based on hash similarity
    const duplicatePairs = [];
    const THRESHOLD = 5; // Maximum hamming distance to consider images as duplicates (lower = more strict)

    // Compare all images against each other
    for (let i = 0; i < imageData.length; i++) {
      for (let j = i + 1; j < imageData.length; j++) {
        // Only consider images from different authors
        if (imageData[i].author !== imageData[j].author) {
          const distance = hammingDistance(
            imageData[i].hash,
            imageData[j].hash
          );
          if (distance <= THRESHOLD) {
            duplicatePairs.push({
              file1: imageData[i].file,
              file2: imageData[j].file,
              author1: imageData[i].author,
              author2: imageData[j].author,
              similarity: Math.round(((16 - distance) / 16) * 100), // Convert to percentage
              distance,
            });
          }
        }
      }
    }

    // Sort by similarity (highest first)
    duplicatePairs.sort((a, b) => b.similarity - a.similarity);

    // Print duplicate pairs table
    log("# Duplicate Pairs");
    log("| Pair | File 1 | File 2 | Similarity |");
    log("| ---- | ------ | ------ | ---------- |");

    duplicatePairs.forEach((pair, index) => {
      log(
        `| D${index + 1} | ${pair.file1} | ${pair.file2} | ${
          pair.similarity
        }% |`
      );
    });

    log(
      `\nFound ${duplicatePairs.length} duplicate pairs among ${files.length} images using hash-based comparison.`
    );
    log(
      `\nHash threshold: ${THRESHOLD} (lower values indicate stricter matching).`
    );

    // Close the output stream
    outputStream.end();

    console.log(`\nResults have been written to ${outputFile}`);
  } catch (error) {
    console.error("Error finding duplicates:", error);
  }
}

// Run the duplicate detection
findDuplicates();
