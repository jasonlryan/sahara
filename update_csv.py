import os
import csv
import re
import sys
from PIL import Image
from datetime import datetime
from urllib.parse import quote # Import quote
import urllib.parse

# --- Configuration ---
SOURCE_DIR = 'media'
CSV_FILE = 'media_data.csv'
SUPPORTED_EXTENSIONS = ('.jpeg', '.jpg', '.png', '.gif', '.mp4', '.avi', '.mov', '.mkv') # Add video extensions
EXPECTED_HEADERS = ['URL', 'Author', 'Filename', 'DateTime', 'full_size', 'MediaType', 'mediaUrl', 'filter_day'] # Add URL as first header
GITHUB_RAW_BASE_URL = 'https://raw.githubusercontent.com/jasonlryan/sahara/main/' # GitHub URL base
# LOCAL_BASE_URL = 'http://localhost:3000' # Keep for reference if needed
# Regex to capture Author, Date, Time from WhatsApp format
# Example: AuthorName.WhatsApp Image 2025-03-28 at 21.53.35.jpeg
# Example: AuthorName.WhatsApp Video 2025-03-23 at 16.04.40.mp4
# Example: AuthorName.WhatsApp Image 2025-03-24 at 07.23.03 (2).jpeg # Handle extra chars
# Groups: 1=Author, 2=Date, 3=Time
FILENAME_PATTERN = re.compile(r'^(.+?)\.WhatsApp (?:Image|Video) (\d{4}-\d{2}-\d{2}) at (\d{2}\.\d{2}\.\d{2})(?:\s*\(\d+\))?\..+$', re.IGNORECASE)
# --- End Configuration ---

def get_existing_filenames(csv_path):
    """Reads the CSV and returns a set of existing filenames."""
    existing_files = set()
    if not os.path.exists(csv_path):
        return existing_files # Return empty set if file doesn't exist
    try:
        with open(csv_path, mode='r', newline='', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            # Optional: Check if headers match exactly, could be stricter
            if reader.fieldnames and set(reader.fieldnames) != set(EXPECTED_HEADERS):
                print(f"[Warning] CSV headers ({reader.fieldnames}) don't perfectly match expected ({EXPECTED_HEADERS}).", file=sys.stderr)
            for row in reader:
                # Use the full path stored in the CSV for uniqueness
                if 'Filename' in row and row['Filename']:
                    existing_files.add(row['Filename'])
    except FileNotFoundError:
        pass # Handled by os.path.exists check, but good practice
    except Exception as e:
        print(f"[Error] Failed to read CSV file {csv_path}: {e}", file=sys.stderr)
    return existing_files

def get_image_dimensions(file_path):
    """Gets the dimensions of an image file."""
    try:
        with Image.open(file_path) as img:
            width, height = img.size
            return f"{width}x{height}"
    except FileNotFoundError:
        print(f"[Error] Image file not found for dimension check: {file_path}", file=sys.stderr)
    except Image.UnidentifiedImageError:
        print(f"[Error] Cannot identify image file (may be corrupt or not an image): {file_path}", file=sys.stderr)
    except Exception as e:
        print(f"[Error] Failed to get dimensions for {file_path}: {e}", file=sys.stderr)
    return None # Return None on error

def extract_metadata(filename):
    """Extract Author, Date, and Time from filename using regex."""
    match = FILENAME_PATTERN.match(filename)
    if match:
        author = match.group(1)
        date_str = match.group(2)
        time_str = match.group(3)
        return author, date_str, time_str
    return None

def sync_and_update_csv():
    """Synchronize media files with CSV and update entries."""
    print("Starting CSV synchronization and update process...")
    print(f"Source directory: {SOURCE_DIR}")
    print(f"CSV file: {CSV_FILE}")

    # Initialize empty dictionary for existing entries
    existing_entries = {}
    
    # Create new CSV file with headers if it doesn't exist
    if not os.path.exists(CSV_FILE):
        print(f"No existing {CSV_FILE} found. Creating a new one.")
        with open(CSV_FILE, mode='w', newline='', encoding='utf-8') as outfile:
            writer = csv.DictWriter(outfile, fieldnames=EXPECTED_HEADERS)
            writer.writeheader()
    else:
        # Read existing entries if file exists
        with open(CSV_FILE, mode='r', newline='', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            if reader.fieldnames != EXPECTED_HEADERS:
                print(f"Warning: CSV headers don't match expected headers")
                print(f"Expected: {EXPECTED_HEADERS}")
                print(f"Found: {reader.fieldnames}")
            for row in reader:
                existing_entries[row['Filename']] = row
        print(f"Found {len(existing_entries)} existing entries in {CSV_FILE}.")

    # Get list of files in the media directory
    if not os.path.isdir(SOURCE_DIR):
        print(f"Error: Media directory '{SOURCE_DIR}' not found.")
        return

    media_files = [f for f in os.listdir(SOURCE_DIR) if os.path.splitext(f)[1].lower() in SUPPORTED_EXTENSIONS]
    
    # Process each media file
    new_entries = []
    files_processed = 0
    files_skipped = 0

    for filename in media_files:
        relative_path = os.path.join(SOURCE_DIR, filename)
        
        # Skip if already in CSV
        if relative_path in existing_entries:
            files_skipped += 1
            continue

        # Extract metadata
        metadata = extract_metadata(filename)
        if metadata:
            author, date_str, time_str = metadata
            datetime_str = f"{date_str} {time_str.replace('.', ':')}"
            
            # Get image dimensions if it's an image
            full_size = ""
            if os.path.splitext(filename)[1].lower() in {'.jpg', '.jpeg', '.png', '.gif'}:
                try:
                    with Image.open(relative_path) as img:
                        width, height = img.size
                        full_size = f"{width}x{height}"
                except Exception as e:
                    print(f"Warning: Could not get dimensions for {filename}: {e}")

            # Determine media type
            media_type = "video" if os.path.splitext(filename)[1].lower() in {'.mp4', '.avi', '.mov', '.mkv'} else "image"

            # Create entry
            entry = {
                'URL': urllib.parse.urljoin(GITHUB_RAW_BASE_URL.rstrip('/'), urllib.parse.quote(relative_path.replace('\\', '/'))),
                'Author': author,
                'Filename': relative_path,
                'DateTime': datetime_str,
                'full_size': full_size,
                'MediaType': media_type,
                'mediaUrl': f"http://localhost:3000/{relative_path}",
                'filter_day': ''  # This will be filled by add_day_of_week.py
            }
            new_entries.append(entry)
            files_processed += 1
        else:
            print(f"Warning: Could not extract metadata from {filename}")

    # Write all entries to CSV
    with open(CSV_FILE, mode='w', newline='', encoding='utf-8') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=EXPECTED_HEADERS)
        writer.writeheader()
        # Write existing entries first
        for entry in existing_entries.values():
            writer.writerow(entry)
        # Write new entries
        writer.writerows(new_entries)

    print(f"\nProcessing complete:")
    print(f"Files processed: {files_processed}")
    print(f"Files skipped (already in CSV): {files_skipped}")
    print(f"Total entries in CSV: {len(existing_entries) + len(new_entries)}")

if __name__ == "__main__":
    sync_and_update_csv() 