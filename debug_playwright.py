from playwright.sync_api import sync_playwright
import os
import json

# Load admin storage state if exists
storage_path = 'd:/project/egov-enterprise/frontend/playwright/.auth/admin.json'
storage_state = None
if os.path.exists(storage_path):
    with open(storage_path, 'r') as f:
        storage_state = json.load(f)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    # Use context with storage state
    context = browser.new_context(storage_state=storage_path if os.path.exists(storage_path) else None)
    page = context.new_page()
    
    # 1. Check User Management
    print("Checking User Management...")
    page.goto('http://localhost:3001/admin/user/manage')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='d:/project/egov-enterprise/user_manage_debug.png', full_page=True)
    print(f"User Management Page Title: {page.title()}")
    
    # 2. Check Online Poll
    print("Checking Online Poll...")
    page.goto('http://localhost:3001/admin/survey/polls')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='d:/project/egov-enterprise/poll_manage_debug.png', full_page=True)
    
    # 3. List buttons on Poll page
    buttons = page.get_by_role('button').all()
    print("Buttons on Poll page:")
    for btn in buttons:
        print(f" - {btn.inner_text()}")
        
    browser.close()
