import json

mapping = {
    # Collaboration
    "/admin/collaboration/all-schdul": "/admin/collaboration",
    "/admin/collaboration/dept-schdul": "/admin/collaboration",
    "/admin/collaboration/indvdl-schdul": "/admin/collaboration",
    "/admin/collaboration/leader-schdul": "/admin/collaboration",
    "/admin/collaboration/bbs-master-infs": "/admin/collaboration",
    "/admin/collaboration/sndng-mail": "/admin/collaboration",
    "/admin/collaboration/dept-job": "/admin/collaboration",
    "/admin/collaboration/dept-job-bx": "/admin/collaboration",
    
    # System Codes
    "/admin/system/administ-code": "/admin/system/common-code/codes",
    "/admin/system/cmmn-cl-code": "/admin/system/common-code/groups",
    "/admin/system/common-code/groups": "/admin/system/common-code/groups",
    "/admin/system/common-code/details": "/admin/system/common-code/details",
    "/admin/system/common-code/zip": "/admin/system/common-code/zip",
    
    # System Menus & Programs
    "/admin/system/menu-creat": "/admin/system/menus/by-authority",
    "/admin/system/site-mapng": "/admin/system/menus",
    "/admin/system/menus": "/admin/system/menus",
    "/admin/system/programs": "/admin/system/programs",
    
    # Monitoring & Logs
    "/admin/utility/db-mntrng": "/admin/system/monitoring",
    "/admin/utility/file-sys-mntrng": "/admin/system/monitoring",
    "/admin/utility/com-utl-http-mon": "/admin/system/monitoring",
    "/admin/utility/com-utl-process-mon": "/admin/system/monitoring",
    "/admin/utility/mntrng-server": "/admin/system/monitoring",
    "/admin/utility/ntwrk-svc-mntrng": "/admin/system/monitoring",
    "/admin/utility/proxy-svc": "/admin/system/monitoring",
    "/admin/utility/trsmrcv-mntrng": "/admin/system/monitoring",
    "/admin/utility/login-session": "/admin/system/logs/login",
    "/admin/system/logs/login": "/admin/system/logs/login",
    
    # Security
    "/admin/security/groups": "/admin/security/group",
    "/admin/security/group": "/admin/security/group",
    "/admin/security/authority": "/admin/security/authority",
    "/admin/security/role": "/admin/security/role",
    "/admin/security/dept-authority": "/admin/security/dept-authority",
    
    # User & Vacation
    "/admin/user/vcatn": "/admin/system/vacation",
    "/admin/user/mber": "/admin/user/manage",
    "/admin/user/entrprs-mber": "/admin/user/manage",
    "/admin/user/manage": "/admin/user/manage",
    "/admin/user/login-policy": "/admin/user/manage",
    
    # Stats
    "/admin/stats/user-stats": "/admin/stats/user",
    "/admin/stats/user": "/admin/stats/user",
    "/admin/stats/reprt-stats": "/admin/stats",
    
    # Help/Others
    "/admin/user/hpcm": "/help",
    "/admin/user/annvrsry": "/uss/ion/anniversaries",
    "/admin/help/faq": "/admin/help/faq",
    "/admin/help/qna": "/admin/help/qna"
}

sql_lines = ["BEGIN;"]
for old_url, new_url in mapping.items():
    sql_lines.append(f"UPDATE public.nprogrmlist SET url = '{new_url}' WHERE url = '{old_url}';")
sql_lines.append("COMMIT;")

print("\n".join(sql_lines))
