from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use storage state if available, but for connectivity check, we can just goto login
        page = browser.new_page()
        try:
            print("Visiting http://localhost:3001/login...")
            page.goto("http://localhost:3001/login", wait_until="networkidle", timeout=30000)
            print(f"Page title: {page.title()}")
            print(f"Status: SUCCESS visiting login")
            
            # Try /admin
            print("Visiting http://localhost:3001/admin...")
            response = page.goto("http://localhost:3001/admin", wait_until="networkidle", timeout=30000)
            if response:
                print(f"Admin Visit Status: {response.status}")
                print(f"Final URL: {page.url}")
            else:
                print("Admin Visit FAILED (No response)")
                
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
