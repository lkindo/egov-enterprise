
import sys

log_file = r"d:\project\egov-enterprise\temp_log.txt"
output_file = r"d:\project\egov-enterprise\error_trace.txt"

def extract_error():
    try:
        with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        
        # Find the index of the last "500 INTERNAL_SERVER_ERROR"
        target_index = -1
        for i in range(len(lines) - 1, -1, -1):
            if "500 INTERNAL_SERVER_ERROR" in lines[i]:
                target_index = i
                break
        
        if target_index != -1:
            start_index = max(0, target_index - 150)
            end_index = min(len(lines), target_index + 10)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.writelines(lines[start_index:end_index])
            print(f"Extracted lines {start_index} to {end_index}")
        else:
            print("Target string not found.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_error()
