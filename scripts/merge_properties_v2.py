
import os

TEMPLATE_ROOT = r"d:\project\egov-enterprise\egovframe-template-common-components-5.0.0\src\main\resources\egovframework\message\com"
TARGET_ROOT = r"d:\project\egov-enterprise\api-server\src\main\resources\egovframework\message\com"

TARGET_KO = os.path.join(TARGET_ROOT, "message-common_ko.properties")
TARGET_EN = os.path.join(TARGET_ROOT, "message-common_en.properties")

def merge_properties(lang_suffix, target_file):
    print(f"Merging *_{lang_suffix}.properties to {target_file}...")
    
    # Reset Logic
    if os.path.exists(target_file):
        with open(target_file, "r", encoding="utf-8") as f_in:
            content = f_in.read()
            marker = "\n\n# ==================================================================\n# Merged Message Properties"
            if marker in content:
                print("  [INFO] Found previous merge marker. Resetting...")
                content = content.split(marker)[0]
                with open(target_file, "w", encoding="utf-8") as f_reset:
                    f_reset.write(content)
            else:
                print("  [INFO] No marker found. Appending to existing content.")
    
    # Merge Logic
    with open(target_file, "a", encoding="utf-8") as f_out:
        f_out.write("\n\n# ==================================================================\n")
        f_out.write(f"# Merged Message Properties ({lang_suffix})\n")
        f_out.write("# ==================================================================\n")

        for root, dirs, files in os.walk(TEMPLATE_ROOT):
            for file in files:
                if file.endswith(f"_{lang_suffix}.properties"):
                    source_path = os.path.join(root, file)
                    rel_path = os.path.relpath(source_path, TEMPLATE_ROOT)
                    
                    if "message-common" in file and root == TEMPLATE_ROOT:
                        print(f"  [DEBUG] FOUND ROOT FILE: {rel_path}")
                    
                    print(f"  Processing: {rel_path}")
                    
                    try:
                        with open(source_path, "r", encoding="utf-8") as f_in:
                            content = f_in.read()
                            f_out.write(f"\n# Source: {rel_path}\n")
                            f_out.write(content)
                            f_out.write("\n")
                    except Exception as e:
                        print(f"  [ERROR] Failed to read {source_path}: {e}")

if __name__ == "__main__":
    if not os.path.exists(TEMPLATE_ROOT):
        print(f"Template root not found: {TEMPLATE_ROOT}")
        exit(1)
        
    print(f"Scanning {TEMPLATE_ROOT}...")
    
    merge_properties("ko", TARGET_KO)
    # merge_properties("en", TARGET_EN)
    
    print("\nMerge completed.")
