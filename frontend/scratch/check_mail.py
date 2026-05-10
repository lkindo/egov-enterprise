from playwright.sync_api import sync_playwright
import time

def check_mail():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use storage state if available, or login manually
        context = browser.new_context(storage_state='playwright/.auth/admin.json')
        page = context.new_page()
        
        print("Navigating to Mail History...")
        page.goto('http://localhost:3001/admin/collaboration/mail-history')
        page.wait_for_load_state('networkidle')
        
        # Wait for potential animation
        time.sleep(2)
        
        print("Current Page Title:", page.title())
        
        # Capture console logs
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
        
        # Check for empty state
        empty_msg = page.locator('[data-testid="empty-table-msg"]')
        if empty_msg.is_visible():
            print("Table is EMPTY")
            print("Empty Message Text:", empty_msg.inner_text())
        
        # Check for rows
        rows = page.locator('[data-testid="mail-item"]')
        count = rows.count()
        print(f"Found {count} mail items")
        
        for i in range(count):
            print(f"Row {i} text: {rows.nth(i).inner_text()}")
            
        # Take a screenshot for visual debugging
        page.screenshot(path='artifacts/mail_history_debug.png', full_page=True)
        print("Screenshot saved to artifacts/mail_history_debug.png")
        
        # Dump DOM for deep inspection
        with open('artifacts/mail_history_dom.html', 'w', encoding='utf-8') as f:
            f.write(page.content())
        print("DOM dumped to artifacts/mail_history_dom.html")
        
        browser.close()

if __name__ == "__main__":
    check_mail()
