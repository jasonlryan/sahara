import os
import csv
import re
import sys
from PIL import Image
from datetime import datetime

# --- Configuration ---
SOURCE_DIR = 'media'
CSV_FILE = 'media_data.csv'
SUPPORTED_EXTENSIONS = ('.jpeg', '.jpg', '.png', '.gif', '.mp4') # Add video extensions
EXPECTED_HEADERS = ['Author', 'Filename', 'DateTime', 'full_size', 'MediaType'] # Add MediaType
# Regex to capture Author, Date, Time from WhatsApp format
# Example: AuthorName.WhatsApp Image 2025-03-28 at 21.53.35.jpeg
# Example: AuthorName.WhatsApp Video 2025-03-23 at 16.04.40.mp4
# Groups: 1=Author, 2=Date, 3=Time
FILENAME_PATTERN = re.compile(r'^(.+?)\.WhatsApp (?:Image|Video) (\d{4}-\d{2}-\d{2}) at (\d{2}\.\d{2}\.\d{2})\..+$', re.IGNORECASE)
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

def update_media_csv():
    """Scans the media directory and updates the CSV with new files."""
    print(f"Starting CSV update process...")
    print(f"Source directory: {SOURCE_DIR}")
    print(f"CSV file: {CSV_FILE}")

    if not os.path.isdir(SOURCE_DIR):
        print(f"[Error] Source directory '{SOURCE_DIR}' not found.", file=sys.stderr)
        return

    existing_filenames_in_csv = get_existing_filenames(CSV_FILE)
    print(f"Found {len(existing_filenames_in_csv)} existing entries in {CSV_FILE}.")

    new_rows = []
    files_scanned = 0
    files_added = 0
    files_skipped = 0
    errors = 0

    for filename in os.listdir(SOURCE_DIR):
        source_path = os.path.join(SOURCE_DIR, filename)
        # Construct the relative path as stored in the CSV for comparison
        relative_path = os.path.join(SOURCE_DIR, filename) # e.g., media/image.jpeg
        
        # Check if it's a file and has a supported extension
        if not os.path.isfile(source_path) or not filename.lower().endswith(SUPPORTED_EXTENSIONS):
             continue # Skip directories or unsupported file types

        files_scanned += 1

        # --- Check if already in CSV --- 
        if relative_path in existing_filenames_in_csv:
            # print(f"  - Skipping (already in CSV): {filename}") # Optional: verbose skipping
            files_skipped += 1
            continue
        # --- End Check ---
        
        print(f"Processing new file: {filename}")

        # --- Determine Media Type --- 
        media_type = 'unknown'
        file_ext = filename.lower().split('.')[-1]
        if file_ext in ('jpeg', 'jpg', 'png', 'gif'):
            media_type = 'image'
        elif file_ext in ('mp4', 'mov', 'avi'): # Add other video types if needed
            media_type = 'video'
        # --- End Determine Media Type ---

        # Attempt to parse filename for author, date, time
        author = filename.split('.')[0] # Simple extraction before first dot
        date_str = ''
        time_str = ''
        datetime_str = ''
        match = FILENAME_PATTERN.match(filename)
        if match:
             # Overwrite author if pattern matches, potentially more specific
             author = match.group(1) 
             date_str = match.group(2)
             time_str = match.group(3).replace('.', ':') # Change HH.MM.SS to HH:MM:SS
             try:
                 # Combine and format (optional validation)
                 parsed_dt = datetime.strptime(f"{date_str} {time_str}", '%Y-%m-%d %H:%M:%S')
                 datetime_str = parsed_dt.strftime('%Y-%m-%d %H:%M:%S')
             except ValueError:
                 print(f"  [Warning] Could not parse date/time '{date_str} {time_str}' for {filename}", file=sys.stderr)
                 datetime_str = '' # Or keep raw parts if needed
        else:
            print(f"  [Warning] Filename '{filename}' did not match expected WhatsApp pattern. Using basic author extraction.", file=sys.stderr)
            # Leave datetime_str empty if pattern doesn't match

        # Get image dimensions only for images
        dimensions = '' # Default to empty for non-images
        if media_type == 'image':
            dimensions = get_image_dimensions(source_path)
            if dimensions is None:
                print(f"  [Error] Skipping image due to dimension reading error: {filename}", file=sys.stderr)
                errors += 1
                continue # Skip if we couldn't get dimensions for an image
        
        # Add to list of new rows to append
        new_rows.append({
            'Author': author,
            'Filename': relative_path,
            'DateTime': datetime_str,
            'full_size': dimensions, # Will be empty for videos
            'MediaType': media_type
        })
        files_added += 1
        print(f"  - Added: Type='{media_type}', Author='{author}', DateTime='{datetime_str}', Size='{dimensions or 'N/A'}'")
        
    # --- Append new rows to CSV --- 
    if new_rows:
        print(f"Appending {len(new_rows)} new entries to {CSV_FILE}...")
        # Check if file exists to determine if header needs writing
        file_exists = os.path.exists(CSV_FILE)
        needs_header = (not file_exists or os.path.getsize(CSV_FILE) == 0)
        
        # If file exists, check if headers actually match
        if file_exists and not needs_header:
            try:
                 with open(CSV_FILE, mode='r', newline='', encoding='utf-8') as checkfile:
                     # Read just the first line to check headers
                     reader = csv.reader(checkfile)
                     actual_headers = next(reader, None)
                     if actual_headers != EXPECTED_HEADERS:
                         print(f"[Warning] Existing headers {actual_headers} differ from expected {EXPECTED_HEADERS}. Header may be incorrect.", file=sys.stderr)
                         # Decide if you want to force header write or handle mismatch
                         # needs_header = True # Uncomment to force rewrite (dangerous if data exists)
            except Exception as e:
                 print(f"[Warning] Could not read existing headers from {CSV_FILE}: {e}", file=sys.stderr)

        try:
            with open(CSV_FILE, mode='a', newline='', encoding='utf-8') as outfile:
                writer = csv.DictWriter(outfile, fieldnames=EXPECTED_HEADERS)
                if needs_header:
                    print("  - Writing CSV header.")
                    writer.writeheader()
                writer.writerows(new_rows)
        except Exception as e:
             print(f"[Error] Failed to write to CSV file {CSV_FILE}: {e}", file=sys.stderr)
             errors += len(new_rows) # Count these as errors
             files_added -= len(new_rows)

    print("\nCSV update process complete.")
    print(f"Summary: Scanned={files_scanned}, Added={files_added}, Skipped (already present)={files_skipped}, Errors={errors}")

if __name__ == "__main__":
    update_media_csv() 