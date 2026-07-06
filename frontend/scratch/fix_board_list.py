
import os
import re

path = r"d:\project\egov-enterprise\frontend\src\app\admin\community\boards\selectBoardList\BoardListClient.tsx"

with open(path, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

# Line 318 is corrupted (1-indexed, so index 317)
# But let's find it by content to be safe.
target_pattern = "</div>tItem>"
redundant_start = None
for i, line in enumerate(lines):
    if target_pattern in line:
        redundant_start = i
        break

if redundant_start is not None:
    print(f"Found corruption at line {redundant_start + 1}")
    # The redundant block looked like:
    # </div>tItem>
    #                     </SelectContent>
    #                   </Select>
    #                 </div>
    #
    #                 <div className="flex gap-4">
    #                   <Button type="submit" size="lg" className="h-16 px-12 gap-3 bg-slate-950 border-4 border-white shadow-2xl hover:scale-105 transition-all active:scale-95 font-black text-white rounded-[0.1rem]">
    #                   <Search className="w-6 h-6" /> 조회
    #                 </Button>
    #               </div>
    
    # We want to remove from redundant_start up to the next </div> that closes the Button container.
    # Looking at the pattern: 
    # 318:              </div>tItem>
    # 319:                    </SelectContent>
    # 320:                  </Select>
    # 321:                </div>
    # 322:
    # 323:                <div className="flex gap-4">
    # 324:                  <Button ...>
    # 325:                  <Search ... /> 조회
    # 326:                </Button>
    # 327:              </div>
    
    # So we remove lines [redundant_start : redundant_start + 10] approximately.
    # Let's find the closing </div> of the button block.
    end_index = redundant_start
    for i in range(redundant_start, len(lines)):
        if "</div>" in lines[i] and i > redundant_start + 5: # Skip the first few div closes
             end_index = i
             break
    
    print(f"Removing lines {redundant_start + 1} to {end_index + 1}")
    new_lines = lines[:redundant_start] + lines[end_index + 1:]
    
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Fix applied.")
else:
    print("Corruption not found.")
