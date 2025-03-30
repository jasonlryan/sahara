import os
from PIL import Image
import sys

# --- Configuration ---
SOURCE_DIR = 'media'
OUTPUT_DIR_BASE = 'web_media'
SIZES = {
    '1024': 1024,
    '800': 800,
    '400': 400
}
SUPPORTED_EXTENSIONS = ('.jpeg', '.jpg', '.png', '.gif') # Add more if needed
# --- End Configuration ---

def resize_image(input_path, output_path, target_width):
    """Resizes an image to the target width, preserving aspect ratio."""
    try:
        img = Image.open(input_path)
        width_percent = (target_width / float(img.size[0]))
        target_height = int((float(img.size[1]) * float(width_percent)))
        
        # Handle cases where original image might be narrower than target width
        if img.size[0] <= target_width:
            print(f"    - Skipping resize for {target_width}px, image already small enough: {os.path.basename(input_path)}")
            # Optionally copy the original if you always want a file in the target dir
            # img.save(output_path, quality=85, optimize=True) # Uncomment to copy
            return False # Indicate no resize happened

        img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save the resized image (adjust quality as needed)
        # For JPEG, quality=85 is a good balance. Optimize helps reduce file size.
        if output_path.lower().endswith(('.jpeg', '.jpg')):
             img.save(output_path, quality=85, optimize=True)
        else:
            img.save(output_path, optimize=True) # Optimize works for PNG/GIF too
            
        print(f"    - Resized to {target_width}px: {os.path.basename(output_path)}")
        return True # Indicate resize happened

    except Exception as e:
        print(f"[ERROR] Failed to process {input_path}: {e}", file=sys.stderr)
        return False

def process_images():
    """Scans the source directory and processes supported image files."""
    print(f"Starting image processing...")
    print(f"Source directory: {SOURCE_DIR}")
    print(f"Output base directory: {OUTPUT_DIR_BASE}")
    print(f"Target widths: {list(SIZES.values())}")

    if not os.path.isdir(SOURCE_DIR):
        print(f"[ERROR] Source directory '{SOURCE_DIR}' not found.", file=sys.stderr)
        return

    processed_count = 0
    skipped_count = 0
    error_count = 0

    for filename in os.listdir(SOURCE_DIR):
        if filename.lower().endswith(SUPPORTED_EXTENSIONS):
            source_path = os.path.join(SOURCE_DIR, filename)
            if os.path.isfile(source_path):
                print(f"Processing: {filename}")
                
                file_processed = False
                for size_label, target_width in SIZES.items():
                    output_subdir = os.path.join(OUTPUT_DIR_BASE, size_label)
                    output_path = os.path.join(output_subdir, filename) # Keep original filename

                    # --- Add check for existing file ---
                    if os.path.exists(output_path):
                        print(f"    - Skipping {target_width}px, already exists: {os.path.basename(output_path)}")
                        continue # Move to the next size for this image
                    # --- End check ---
                    
                    try:
                         if resize_image(source_path, output_path, target_width):
                             file_processed = True
                         else:
                            # Check if it failed or was skipped due to size
                            if not os.path.exists(output_path): # Simple check if it was skipped
                                print(f"    - Skipping resize for {target_width}px: {filename}")
                    except Exception as e:
                        print(f"[ERROR] Unexpected error during resize call for {filename}: {e}", file=sys.stderr)
                        error_count += 1 # Count error for the specific size attempt
                        
                if file_processed:
                     processed_count += 1
                elif error_count == 0 : # Only count as skipped if no errors occurred for this file
                     skipped_count += 1
            else:
                 print(f"Skipping non-file item: {filename}")
        else:
            # Optional: print skipped non-image files
            # print(f"Skipping non-image file: {filename}")
            pass

    print("\nImage processing complete.")
    print(f"Summary: Processed={processed_count}, Skipped (already small enough)={skipped_count}, Errors={error_count > 0}") # Simplified error summary


if __name__ == "__main__":
    process_images() 