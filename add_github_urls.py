import csv
import os
import shutil
from urllib.parse import quote

CSV_FILE = 'media_data.csv'
TEMP_CSV_FILE = 'media_data_temp.csv'
GITHUB_RAW_BASE_URL = 'https://raw.githubusercontent.com/jasonlryan/sahara/main/'
NEW_COLUMN_NAME = 'URL'

def add_github_url_column():
    print(f"Updating {CSV_FILE} to add {NEW_COLUMN_NAME} column...")

    if not os.path.exists(CSV_FILE):
        print(f"Error: {CSV_FILE} not found.")
        return

    updated_rows_data = []
    original_headers = []

    # Read existing data
    try:
        with open(CSV_FILE, mode='r', newline='', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            original_headers = reader.fieldnames
            if not original_headers:
                print(f"Error: Could not read headers from {CSV_FILE}.")
                return

            if NEW_COLUMN_NAME in original_headers:
                print(f"Error: Column '{NEW_COLUMN_NAME}' already exists. Please remove it or rename the NEW_COLUMN_NAME variable.")
                return

            for i, row in enumerate(reader):
                processed_row = {NEW_COLUMN_NAME: ''} # Initialize new row with URL first
                if 'Filename' in row and row['Filename']:
                    relative_path = row['Filename']
                    try:
                        # Split path into directory and filename for proper encoding
                        dir_part, file_part = os.path.split(relative_path)
                        # URL encode only the filename part
                        encoded_file_part = quote(file_part)
                        # Reconstruct the path with encoded filename
                        encoded_relative_path = os.path.join(dir_part, encoded_file_part).replace('\\', '/') # Ensure forward slashes

                        # Construct the full URL
                        full_url = f"{GITHUB_RAW_BASE_URL.rstrip('/')}/{encoded_relative_path.lstrip('/')}"
                        processed_row[NEW_COLUMN_NAME] = full_url
                    except Exception as url_e:
                        print(f"Warning: Error processing filename '{relative_path}' on row {i+1}: {url_e}")
                else:
                    print(f"Warning: Missing 'Filename' on row {i+1}. Cannot generate URL.")
                
                # Add the original data after the new URL column
                for header in original_headers:
                    processed_row[header] = row.get(header, '')
                    
                updated_rows_data.append(processed_row)

    except Exception as e:
        print(f"Error reading {CSV_FILE}: {e}")
        return

    if not updated_rows_data:
        print("No data rows found or processed in CSV.")
        return

    # Define new headers with URL at the beginning
    new_headers = [NEW_COLUMN_NAME] + original_headers

    # Write to temporary file
    try:
        with open(TEMP_CSV_FILE, mode='w', newline='', encoding='utf-8') as outfile:
            # Use the new header order
            writer = csv.DictWriter(outfile, fieldnames=new_headers)
            writer.writeheader()
            writer.writerows(updated_rows_data)
    except Exception as e:
        print(f"Error writing to temporary file {TEMP_CSV_FILE}: {e}")
        if os.path.exists(TEMP_CSV_FILE):
            try: os.remove(TEMP_CSV_FILE)
            except OSError: pass
        return

    # Replace original file with temporary file
    try:
        shutil.move(TEMP_CSV_FILE, CSV_FILE)
        print(f"Successfully updated {CSV_FILE}, adding '{NEW_COLUMN_NAME}' as the first column.")
    except Exception as e:
        print(f"Error replacing original file {CSV_FILE} with {TEMP_CSV_FILE}: {e}")

# Run the function
add_github_url_column() 