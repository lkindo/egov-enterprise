from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Go to the dashboard
        page.goto("http://localhost:3000")

        # Wait for a bit to see where we land
        page.wait_for_timeout(3000)

        # Take a screenshot
        page.screenshot(path="dashboard_verification.png", full_page=True)

        print("Screenshot taken at dashboard_verification.png")
        print("Page title:", page.title())
        print("Page URL:", page.url)

        browser.close()

if __name__ == "__main__":
    run()
