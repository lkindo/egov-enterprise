import os
import shutil

def run_migration():
    base_dir = r"d:\project\egov-enterprise"
    report_path = os.path.join(base_dir, "final_comprehensive_verification.md")
    
    source_root = os.path.join(base_dir, "egovframe-template-common-components-5.0.0", "src", "main", "webapp", "WEB-INF", "jsp")
    target_root = os.path.join(base_dir, "api-server", "src", "main", "webapp", "WEB-INF", "jsp")
    
    if not os.path.exists(report_path):
        print("Report not found.")
        return

    with open(report_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    migrated_count = 0
    errors = []
    
    for line in lines:
        if "❌ 이관필요" in line:
            parts = line.split("|")
            if len(parts) < 6: continue
            
            # Extract path (e.g., /egovframework/com/sts/ust/EgovUserStats.jsp)
            rel_path = parts[5].strip().lstrip("/")
            
            src_file = os.path.join(source_root, rel_path.replace("/", os.sep))
            tgt_file = os.path.join(target_root, rel_path.replace("/", os.sep))
            
            if os.path.exists(src_file):
                os.makedirs(os.path.dirname(tgt_file), exist_ok=True)
                try:
                    shutil.copy2(src_file, tgt_file)
                    migrated_count += 1
                except Exception as e:
                    errors.append(f"Copy failed: {rel_path} ({str(e)})")
            else:
                errors.append(f"Source not found: {rel_path}")
                
    print(f"Migration finished. Successfully migrated: {migrated_count}")
    if errors:
        print(f"Total errors: {len(errors)}")
        with open("migration_errors.log", "w", encoding="utf-8") as logf:
            for err in errors:
                logf.write(err + "\n")

if __name__ == "__main__":
    run_migration()
