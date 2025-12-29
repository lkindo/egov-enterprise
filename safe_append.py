
# Safe append script to ensure encoding
target_path = r'egovframe-template-common-components-5.0.0\script\ddl\postgres\com_DDL_postgres.sql'
source_path = 'generated_comments.sql'

with open(source_path, 'r', encoding='utf-8') as src:
    comments = src.read()

# We should make sure we're not appending twice if I'm re-running.
# But for now, let's just write. I might need to clean up first if 'type' did something wrong.

# Let's read the current content of target
with open(target_path, 'r', encoding='utf-8') as tgt:
    original_content = tgt.read()

# If the garbled text is already there, I should probably revert or fix.
# Since I only appended, I can look for where the comments started.
# But easier is to just overwrite the file if I have the original + new comments.

# Wait, I don't want to lose the original.
# Let's see where the original content ends (before my append).
# I'll just rewrite the file from scratch with original + comments.
# Actually, I should have a backup.

# Let's just use Python to append cleanly.
with open(target_path, 'a', encoding='utf-8') as tgt:
    tgt.write('\n\n-- Generated Comments --\n')
    tgt.write(comments)

print("Appended comments successfully with UTF-8 encoding.")
