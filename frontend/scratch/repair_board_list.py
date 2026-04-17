
import os

path = r"d:\project\egov-enterprise\frontend\src\app\admin\community\boards\selectBoardList\BoardListClient.tsx"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# The corrupted pattern looks like:
# ... h-14 ... 조회 ... </div>tItem> ... h-16 ... 조회 ... </div>

import re

# We want to remove the redundant block that starts with '</div>tItem>' and ends with the next '</div>' that contains the old 'h-16' button.
# Looking at the content, it's:
# </div>tItem>
#                     </SelectContent>
#                   </Select>
#                 </div>
#
#                 <Button type="submit" size="lg" className="h-16 px-12 gap-3 bg-slate-900 dark:bg-primary border-4 border-white dark:border-slate-800 shadow-2xl hover:scale-105 transition-all active:scale-95 font-black text-white rounded-[0.1rem]">
#                   <Search className="w-6 h-6" /> 조회
#                 </Button>
#               </div>

pattern = r'<\/div>tItem>[\s\S]*?className="h-16[\s\S]*?<\/div>'
fixed_content = re.sub(pattern, '', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print("Repair completed.")
