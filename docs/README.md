# Sahara Project - Media Processing Workflow

This document outlines the steps to add new media assets (images and videos) to the project and process them for the website.

## Prerequisites

- Python 3 installed.
- Node.js and npm installed.
- FFmpeg installed (e.g., via `brew install ffmpeg` on macOS).
- Required Python packages installed (run `pip install -r requirements.txt` in your activated virtual environment `source .venv/bin/activate`).

## Workflow for Adding New Media

Follow these steps after adding new image or video files:

1.  **Add Media Files:**

    - Copy your new image (`.jpeg`, `.jpg`, `.png`, `.gif`) or video (`.mp4`) files into the `media/` directory located in the project root.
    - **(Optional but Recommended):** If possible, follow the naming convention `AuthorName.WhatsApp Type YYYY-MM-DD at HH.MM.SS.ext` (e.g., `JaneDoe.WhatsApp Image 2024-01-15 at 10.30.00.jpeg`) for automatic parsing of Author and DateTime.

2.  **Update Data File (`media_data.csv`):**

    - Open your terminal in the project root directory (`/Users/jasonlryan/Documents/sahara`).
    - Make sure your Python virtual environment is active (e.g., `source .venv/bin/activate`).
    - Run the update script:
      ```bash
      python3 update_csv.py
      ```
    - **What it does:** This script scans `media/`, compares it to `media_data.csv`, and appends rows for any new files found. It automatically determines the `MediaType`, parses Author/DateTime if the filename matches the pattern, calculates the GitHub raw `URL`, and gets dimensions for images.

3.  **Process Media Files:**

    - Run the necessary processing scripts based on the type of media you added. These scripts will only process files that haven't been processed yet (i.e., if the output file doesn't already exist).
    - **If you added IMAGES:**
      ```bash
      python3 resize_images.py
      ```
      _(Creates 400px, 800px, 1024px versions in `web_media/<size>/`)_
    - **If you added VIDEOS:**
      ```bash
      python3 video_thumbnails.py
      ```
      _(Creates a poster image in `web_media/thumbnails/`)_
      ```bash
      python3 transcode_videos.py
      ```
      _(Creates a 480p version in `web_media/videos_480p/`)_

4.  **(Optional) Commit Changes to GitHub:**
    - Stage the changes (new media, updated CSV, new web assets):
      ```bash
      git add .
      ```
    - Commit the changes:
      ```bash
      git commit -m "Add new media and process assets: [brief description]"
      ```
    - Push the commit to GitHub:
      ```bash
      git push origin main
      ```

## Running the Development Web Server

To view the media on the local development website:

1.  Open your terminal in the project root directory.
2.  Run the startup script:
    ```bash
    ./start_dev.sh
    ```
3.  This starts both the backend Node.js server (API) and the frontend Vite server.
4.  Open the URL provided by the Vite server (usually `http://localhost:5173`) in your browser.
5.  Press `Ctrl+C` in the terminal running the script to stop both servers.
