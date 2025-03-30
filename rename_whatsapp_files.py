import os
import sys

def rename_files_with_name(directory, name):
    # List all files in the specified directory
    for filename in os.listdir(directory):
        # Check if the file starts with 'WhatsApp'
        if filename.startswith('WhatsApp'):
            # Construct the new filename
            new_filename = f"{name}.{filename}"
            # Get the full path for the old and new filenames
            old_file = os.path.join(directory, filename)
            new_file = os.path.join(directory, new_filename)
            # Rename the file
            os.rename(old_file, new_file)
            print(f"Renamed '{filename}' to '{new_filename}'")

if __name__ == "__main__":
    # Check if the correct number of arguments are provided
    if len(sys.argv) != 3:
        print("Usage: python rename_whatsapp_files.py <directory> <name>")
        sys.exit(1)

    # Get the directory and name from command line arguments
    directory = sys.argv[1]
    name = sys.argv[2]

    # Call the function to rename files
    rename_files_with_name(directory, name) 