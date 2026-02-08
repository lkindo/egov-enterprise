import sys
import os

def extract_log(log_file='startup.txt'):
    try:
        if not os.path.exists(log_file):
            print(f"Error: The file '{log_file}' was not found.")
            return

        with open(log_file, 'r', encoding='utf-16') as f:
            count = 0
            for line in f:
                count += 1

            print(f"Successfully processed {count} lines from {log_file}")

    except UnicodeError:
        print(f"Error: The file '{log_file}' is not valid UTF-16.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    extract_log()
