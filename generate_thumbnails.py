import os
import csv
import subprocess
import sys

# --- Configuration ---
CSV_FILE = 'media_data.csv'
THUMBNAIL_DIR = 'web_media/thumbnails'
FFMPEG_PATH = 'ffmpeg' # Assumes ffmpeg is in the system PATH
THUMBNAIL_TIME = '00:00:01' # Time point to grab the thumbnail (HH:MM:SS)
THUMBNAIL_QUALITY = '4' # FFmpeg quality scale (2-5 is often good for JPEG)
EXPECTED_CSV_HEADERS = ['Author', 'Filename', 'DateTime', 'full_size', 'MediaType']
# --- End Configuration ---

def create_thumbnail_dir():
    """Creates the thumbnail output directory if it doesn't exist."""
    if not os.path.exists(THUMBNAIL_DIR):
        print(f"Creating thumbnail directory: {THUMBNAIL_DIR}")
        try:
            os.makedirs(THUMBNAIL_DIR)
        except OSError as e:
            print(f"[Error] Failed to create directory {THUMBNAIL_DIR}: {e}", file=sys.stderr)
            return False
    return True

def generate_video_thumbnails():
    """Reads CSV, finds videos, and generates thumbnails using FFmpeg."""
    print("Starting thumbnail generation...")

    if not os.path.exists(CSV_FILE):
        print(f"[Error] CSV file not found: {CSV_FILE}", file=sys.stderr)
        return

    if not create_thumbnail_dir():
        return # Stop if directory creation failed
        
    generated_count = 0
    skipped_count = 0
    error_count = 0
    videos_found = 0

    try:
        with open(CSV_FILE, mode='r', newline='', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            # Basic header check
            if reader.fieldnames and set(reader.fieldnames) != set(EXPECTED_CSV_HEADERS):
                 print(f"[Warning] CSV headers mismatch: {reader.fieldnames} vs {EXPECTED_CSV_HEADERS}", file=sys.stderr)
            
            for row_num, row in enumerate(reader, start=1):
                # Check required columns exist
                if 'MediaType' not in row or 'Filename' not in row:
                     print(f"[Warning] Skipping row {row_num+1}: Missing MediaType or Filename column.", file=sys.stderr)
                     continue

                if row['MediaType'].lower() == 'video':
                    videos_found += 1
                    video_relative_path = row['Filename']
                    video_full_path = os.path.abspath(video_relative_path) # Use absolute path for ffmpeg
                    
                    if not os.path.exists(video_full_path):
                        print(f"  [Error] Video file not found: {video_relative_path}", file=sys.stderr)
                        error_count += 1
                        continue
                        
                    base_filename = os.path.basename(video_relative_path)
                    thumbnail_filename = os.path.splitext(base_filename)[0] + '.jpg'
                    thumbnail_path = os.path.join(THUMBNAIL_DIR, thumbnail_filename)
                    
                    # --- Check if thumbnail already exists ---
                    if os.path.exists(thumbnail_path):
                        # print(f"  - Skipping (already exists): {thumbnail_filename}") # Optional verbose skip
                        skipped_count += 1
                        continue
                    # --- End check ---
                    
                    print(f"Generating thumbnail for: {base_filename}")
                    
                    # Construct FFmpeg command
                    # -ss: seek to time
                    # -i: input file
                    # -vframes 1: output only one frame
                    # -q:v: quality scale (lower is better for JPEG)
                    # -y: overwrite output without asking (though we check existence first)
                    command = [
                        FFMPEG_PATH,
                        '-ss', THUMBNAIL_TIME,
                        '-i', video_full_path,
                        '-vframes', '1',
                        '-q:v', THUMBNAIL_QUALITY,
                        '-y',
                        thumbnail_path
                    ]
                    
                    try:
                        # Run FFmpeg command
                        result = subprocess.run(command, check=True, capture_output=True, text=True)
                        print(f"  - Successfully created: {thumbnail_filename}")
                        generated_count += 1
                    except FileNotFoundError:
                         print(f"[Error] {FFMPEG_PATH} command not found. Ensure FFmpeg is installed and in your PATH.", file=sys.stderr)
                         # Stop processing further videos if ffmpeg isn't found
                         return 
                    except subprocess.CalledProcessError as e:
                        print(f"  [Error] FFmpeg failed for {base_filename}:", file=sys.stderr)
                        print(f"    Command: {' '.join(e.cmd)}", file=sys.stderr)
                        print(f"    Return Code: {e.returncode}", file=sys.stderr)
                        print(f"    Stderr: {e.stderr.strip()}", file=sys.stderr)
                        error_count += 1
                    except Exception as e:
                        print(f"  [Error] An unexpected error occurred generating thumbnail for {base_filename}: {e}", file=sys.stderr)
                        error_count += 1
                        
    except FileNotFoundError:
        print(f"[Error] CSV file not found during processing: {CSV_FILE}", file=sys.stderr)
        return
    except Exception as e:
        print(f"[Error] Failed to process CSV file {CSV_FILE}: {e}", file=sys.stderr)
        return

    print("\nThumbnail generation complete.")
    print(f"Summary: Videos Found={videos_found}, Generated={generated_count}, Skipped={skipped_count}, Errors={error_count}")

if __name__ == "__main__":
    generate_video_thumbnails() 