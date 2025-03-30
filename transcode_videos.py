import os
import csv
import subprocess
import sys

# --- Configuration ---
CSV_FILE = 'media_data.csv'
OUTPUT_DIR = 'web_media/videos_480p'
FFMPEG_PATH = 'ffmpeg' # Assumes ffmpeg is in the system PATH
TARGET_HEIGHT = 480
VIDEO_CODEC = 'libx264'
VIDEO_CRF = '23' # Constant Rate Factor (lower means better quality, larger file). 18-28 is typical.
VIDEO_PRESET = 'medium' # Encoding speed vs compression (e.g., ultrafast, fast, medium, slow)
AUDIO_CODEC = 'aac'
AUDIO_BITRATE = '128k'
EXPECTED_CSV_HEADERS = ['Author', 'Filename', 'DateTime', 'full_size', 'MediaType']
# --- End Configuration ---

def create_output_dir():
    """Creates the output directory if it doesn't exist."""
    if not os.path.exists(OUTPUT_DIR):
        print(f"Creating output directory: {OUTPUT_DIR}")
        try:
            os.makedirs(OUTPUT_DIR)
        except OSError as e:
            print(f"[Error] Failed to create directory {OUTPUT_DIR}: {e}", file=sys.stderr)
            return False
    return True

def transcode_videos():
    """Reads CSV, finds videos, and transcodes them to a smaller size using FFmpeg."""
    print(f"Starting video transcoding (Target Height: {TARGET_HEIGHT}p)...")

    if not os.path.exists(CSV_FILE):
        print(f"[Error] CSV file not found: {CSV_FILE}", file=sys.stderr)
        return

    if not create_output_dir():
        return # Stop if directory creation failed
        
    transcoded_count = 0
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
                if 'MediaType' not in row or 'Filename' not in row:
                     print(f"[Warning] Skipping row {row_num+1}: Missing MediaType or Filename column.", file=sys.stderr)
                     continue

                if row['MediaType'].lower() == 'video':
                    videos_found += 1
                    video_relative_path = row['Filename']
                    video_full_path = os.path.abspath(video_relative_path)
                    
                    if not os.path.exists(video_full_path):
                        print(f"  [Error] Source video file not found: {video_relative_path}", file=sys.stderr)
                        error_count += 1
                        continue
                        
                    base_filename = os.path.basename(video_relative_path)
                    # Keep the same filename in the output directory
                    output_path = os.path.join(OUTPUT_DIR, base_filename)
                    
                    # --- Check if transcoded file already exists ---
                    if os.path.exists(output_path):
                        # print(f"  - Skipping (already exists): {base_filename}") # Optional verbose skip
                        skipped_count += 1
                        continue
                    # --- End check ---
                    
                    print(f"Transcoding: {base_filename} to {TARGET_HEIGHT}p")
                    
                    # Construct FFmpeg command
                    command = [
                        FFMPEG_PATH,
                        '-i', video_full_path,
                        '-vf', f'scale=-2:{TARGET_HEIGHT}', # Scale height, width auto (divisible by 2)
                        '-c:v', VIDEO_CODEC,
                        '-crf', VIDEO_CRF,
                        '-preset', VIDEO_PRESET,
                        '-c:a', AUDIO_CODEC,
                        '-b:a', AUDIO_BITRATE,
                        '-movflags', '+faststart', # Optimize for web streaming
                        '-y', # Overwrite without asking (though we check first)
                        output_path
                    ]
                    
                    try:
                        # Run FFmpeg command
                        result = subprocess.run(command, check=True, capture_output=True, text=True)
                        print(f"  - Successfully created: {os.path.basename(output_path)}")
                        transcoded_count += 1
                    except FileNotFoundError:
                         print(f"[Error] {FFMPEG_PATH} command not found. Ensure FFmpeg is installed and in your PATH.", file=sys.stderr)
                         return # Stop processing if ffmpeg isn't found
                    except subprocess.CalledProcessError as e:
                        print(f"  [Error] FFmpeg failed for {base_filename}:", file=sys.stderr)
                        print(f"    Command: {' '.join(e.cmd)}", file=sys.stderr)
                        print(f"    Return Code: {e.returncode}", file=sys.stderr)
                        print(f"    Stderr: {e.stderr.strip()}", file=sys.stderr)
                        error_count += 1
                        # Optionally delete partially created file on error
                        if os.path.exists(output_path):
                             try: os.remove(output_path) 
                             except OSError: pass
                    except Exception as e:
                        print(f"  [Error] An unexpected error occurred transcoding {base_filename}: {e}", file=sys.stderr)
                        error_count += 1
                        
    except FileNotFoundError:
        print(f"[Error] CSV file not found during processing: {CSV_FILE}", file=sys.stderr)
        return
    except Exception as e:
        print(f"[Error] Failed to process CSV file {CSV_FILE}: {e}", file=sys.stderr)
        return

    print("\nVideo transcoding complete.")
    print(f"Summary: Videos Found={videos_found}, Transcoded={transcoded_count}, Skipped={skipped_count}, Errors={error_count}")

if __name__ == "__main__":
    transcode_videos() 