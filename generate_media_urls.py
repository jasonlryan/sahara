import csv
import os

CSV_FILE = 'media_data.csv'
OUTPUT_FILE = 'media_urls.txt'
BASE_URL = 'http://localhost:3000' # Assuming backend runs here

def create_url_list():
    urls = []
    if not os.path.exists(CSV_FILE):
        print(f"Error: {CSV_FILE} not found.")
        return

    try:
        with open(CSV_FILE, mode='r', newline='', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            for row in reader:
                if 'Filename' in row and row['Filename']:
                    # Filename column already contains 'media/filename.ext'
                    relative_path = row['Filename'] 
                    # Basic check to avoid malformed URLs if path doesn't start with media/
                    if not relative_path.startswith('media/'):
                         print(f"Warning: Skipping row with unexpected filename format: {row['Filename']}")
                         continue
                    # Ensure no leading slash is added if BASE_URL already has one (though it doesn't here)
                    full_url = f"{BASE_URL.rstrip('/')}/{relative_path.lstrip('/')}"
                    urls.append(full_url)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    if not urls:
        print("No valid filenames found in CSV.")
        return

    try:
        with open(OUTPUT_FILE, mode='w', encoding='utf-8') as outfile:
            for url in urls:
                outfile.write(url + '\n')
        print(f"Successfully wrote {len(urls)} URLs to {OUTPUT_FILE}")
    except Exception as e:
        print(f"Error writing to output file: {e}")

# Run the function
create_url_list() 