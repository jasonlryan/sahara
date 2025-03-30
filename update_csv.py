import os
import csv
import re
import sys
from PIL import Image
from datetime import datetime
from urllib.parse import quote # Import quote

# --- Configuration ---
SOURCE_DIR = 'media'
CSV_FILE = 'media_data.csv'
SUPPORTED_EXTENSIONS = ('.jpeg', '.jpg', '.png', '.gif', '.mp4') # Add video extensions
EXPECTED_HEADERS = ['URL', 'Author', 'Filename', 'DateTime', 'full_size', 'MediaType', 'mediaUrl'] # Add URL as first header
GITHUB_RAW_BASE_URL = 'https://raw.githubusercontent.com/jasonlryan/sahara/main/' # GitHub URL base
# LOCAL_BASE_URL = 'http://localhost:3000' # Keep for reference if needed
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

def sync_and_update_csv():
    """Synchronizes the CSV with the media directory and updates with new files."""
    print(f"Starting CSV synchronization and update process...")
    print(f"Source directory: {SOURCE_DIR}")
    print(f"CSV file: {CSV_FILE}")

    if not os.path.isdir(SOURCE_DIR):
        print(f"[Error] Source directory '{SOURCE_DIR}' not found.", file=sys.stderr)
        return

    existing_filenames_in_csv = get_existing_filenames(CSV_FILE)
    print(f"Found {len(existing_filenames_in_csv)} existing entries in {CSV_FILE}.")

    # Get list of files in the media directory
    media_files = set(os.listdir(SOURCE_DIR))

    # Identify and remove entries for missing files
    updated_rows = []
    with open(CSV_FILE, mode='r', newline='', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        fieldnames = reader.fieldnames
        for row in reader:
            if row['Filename'].split('/')[-1] in media_files:
                updated_rows.append(row)
            else:
                print(f"Removing missing file entry: {row['Filename']}")

    # Write the updated data back to the CSV file
    with open(CSV_FILE, mode='w', newline='', encoding='utf-8') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(updated_rows)

    print(f"Synchronization complete. {len(existing_filenames_in_csv) - len(updated_rows)} entries removed.")

    # Continue with adding new files
    new_rows = []
    files_scanned = 0
    files_added = 0
    files_skipped = 0
    errors = 0

    for filename in os.listdir(SOURCE_DIR):
        source_path = os.path.join(SOURCE_DIR, filename)
        relative_path = os.path.join(SOURCE_DIR, filename)

        if not os.path.isfile(source_path) or not filename.lower().endswith(SUPPORTED_EXTENSIONS):
            continue

        files_scanned += 1

        if relative_path in existing_filenames_in_csv:
            files_skipped += 1
            continue

        print(f"Processing new file: {filename}")

        media_type = 'unknown'
        file_ext = filename.lower().split('.')[-1]
        if file_ext in ('jpeg', 'jpg', 'png', 'gif'):
            media_type = 'image'
        elif file_ext in ('mp4', 'mov', 'avi'):
            media_type = 'video'

        author = filename.split('.')[0]
        date_str = ''
        time_str = ''
        datetime_str = ''
        match = FILENAME_PATTERN.match(filename)
        if match:
            author = match.group(1)
            date_str = match.group(2)
            time_str = match.group(3).replace('.', ':')
            try:
                parsed_dt = datetime.strptime(f"{date_str} {time_str}", '%Y-%m-%d %H:%M:%S')
                datetime_str = parsed_dt.strftime('%Y-%m-%d %H:%M:%S')
            except ValueError:
                print(f"  [Warning] Could not parse date/time '{date_str} {time_str}' for {filename}", file=sys.stderr)
                datetime_str = ''
        else:
            print(f"  [Warning] Filename '{filename}' did not match expected WhatsApp pattern. Using basic author extraction.", file=sys.stderr)

        dimensions = ''
        if media_type == 'image':
            dimensions = get_image_dimensions(source_path)
            if dimensions is None:
                print(f"  [Error] Skipping image due to dimension reading error: {filename}", file=sys.stderr)
                errors += 1
                continue

        github_media_url = ''
        try:
            dir_part, file_part = os.path.split(relative_path)
            encoded_file_part = quote(file_part)
            encoded_relative_path = os.path.join(dir_part, encoded_file_part).replace('\\', '/')
            github_media_url = f"{GITHUB_RAW_BASE_URL.rstrip('/')}/{encoded_relative_path.lstrip('/')}"
        except Exception as url_e:
            print(f"  [Warning] Failed to generate GitHub URL for {relative_path}: {url_e}", file=sys.stderr)

        new_rows.append({
            'URL': github_media_url,
            'Author': author,
            'Filename': relative_path,
            'DateTime': datetime_str,
            'full_size': dimensions,
            'MediaType': media_type,
            'mediaUrl': github_media_url
        })
        files_added += 1
        print(f"  - Added: Type='{media_type}', Author='{author}', DateTime='{datetime_str}', Size='{dimensions or 'N/A'}'")

    if new_rows:
        print(f"Appending {len(new_rows)} new entries to {CSV_FILE}...")
        file_exists = os.path.exists(CSV_FILE)
        needs_header = (not file_exists or os.path.getsize(CSV_FILE) == 0)

        if file_exists and not needs_header:
            try:
                with open(CSV_FILE, mode='r', newline='', encoding='utf-8') as checkfile:
                    reader = csv.reader(checkfile)
                    actual_headers = next(reader, None)
                    if actual_headers != EXPECTED_HEADERS:
                        print(f"[Warning] Existing headers {actual_headers} differ from expected {EXPECTED_HEADERS}. Header may be incorrect.", file=sys.stderr)
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
            errors += len(new_rows)
            files_added -= len(new_rows)

    print("\nCSV synchronization and update process complete.")
    print(f"Summary: Scanned={files_scanned}, Added={files_added}, Skipped (already present)={files_skipped}, Errors={errors}")

if __name__ == "__main__":
    sync_and_update_csv() 