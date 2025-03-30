import csv
from datetime import datetime, timezone
import sys
import os

input_filename = 'media_data.csv'
output_filename = 'media_data_temp.csv'

try:
    with open(input_filename, 'r', newline='', encoding='utf-8') as infile, \
         open(output_filename, 'w', newline='', encoding='utf-8') as outfile:
        
        reader = csv.reader(infile)
        writer = csv.writer(outfile)

        # --- Header Handling ---
        try:
            header = next(reader)
        except StopIteration:
            print(f"Error: Input file '{input_filename}' is empty or header is missing.", file=sys.stderr)
            sys.exit(1)
            
        date_col_index = -1
        filter_day_index = -1
        try:
            date_col_index = header.index('DateTime')
            # Try to find existing filter_day column
            try:
                filter_day_index = header.index('filter_day')
            except ValueError:
                # If filter_day column doesn't exist, add it
                header.append('filter_day')
        except ValueError:
            print(f"Error: 'DateTime' column not found in header: {header}", file=sys.stderr)
            sys.exit(1)

        writer.writerow(header) # Write header

        # --- Data Row Processing ---
        line_num = 1 # Start counting data rows after header
        for row in reader:
            line_num += 1
            day_of_week_str = '' # Default to empty string
            try:
                # Check if row has enough columns and DateTime is not empty
                if len(row) > date_col_index and row[date_col_index]:
                    dt_str = row[date_col_index]
                    try:
                        # Parse and convert to UTC
                        dt_obj = datetime.strptime(dt_str, '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)
                        # Format as full day name (e.g., 'Monday')
                        day_of_week_str = dt_obj.strftime('%A')
                    except ValueError:
                        # Handle invalid date format within the expected column
                        print(f"Warning: Invalid date format '{dt_str}' on line {line_num}. Skipping day calculation.", file=sys.stderr)
                        pass # Keep day_of_week_str empty

                # If filter_day column exists, update it; otherwise append it
                if filter_day_index != -1:
                    row[filter_day_index] = day_of_week_str
                    writer.writerow(row)
                else:
                    writer.writerow(row + [day_of_week_str])
                
            except IndexError:
                 # Handle rows that are shorter than expected
                 print(f"Warning: Row {line_num} has fewer columns than expected. Skipping day calculation.", file=sys.stderr)
                 # Write the row as is, padded with an empty string for the new column
                 if filter_day_index != -1:
                     row.extend([''] * (len(header) - len(row)))
                     writer.writerow(row)
                 else:
                     writer.writerow(row + [''])
            except Exception as e:
                # Catch other unexpected errors during row processing
                print(f"Error processing line {line_num} ({row}): {e}", file=sys.stderr)
                # Attempt to write the row anyway, maybe padded
                try:
                    if filter_day_index != -1:
                        row.extend([''] * (len(header) - len(row)))
                        writer.writerow(row)
                    else:
                        writer.writerow(row + [''])
                except Exception as write_err:
                    print(f"Failed to write problematic row {line_num}: {write_err}", file=sys.stderr)

    # --- Finalization ---
    # If successful, replace the original file with the temp file
    os.rename(output_filename, input_filename)
    print(f"Successfully updated 'filter_day' column in '{input_filename}'")

except FileNotFoundError:
    print(f"Error: Input file not found - '{input_filename}'", file=sys.stderr)
    if os.path.exists(output_filename): # Clean up temp file if it was created
        try: os.remove(output_filename)
        except OSError as oe: print(f"Error removing temp file '{output_filename}': {oe}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"An unexpected error occurred: {e}", file=sys.stderr)
    # Clean up temp file if error occurred
    if os.path.exists(output_filename):
        try: os.remove(output_filename)
        except OSError as oe: print(f"Error removing temp file '{output_filename}': {oe}", file=sys.stderr)
    sys.exit(1) 