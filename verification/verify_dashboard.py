from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    try:
        # Go to dashboard
        print("Navigating to http://localhost:3000...")
        page.goto("http://localhost:3000", timeout=60000)

        # Wait for dashboard to load
        # It should show "환영합니다, Test User님!"
        print("Waiting for dashboard content...")
        page.wait_for_selector("text=환영합니다, Test User님!", timeout=60000)

        print("Dashboard loaded successfully.")

        # Verify SummaryCard trend indicator has aria-label
        # Find the element with role="img" and check its aria-label
        trend_indicator = page.locator("div[role='img'][aria-label*='전일 대비']")
        count = trend_indicator.count()
        print(f"Found {count} trend indicators with aria-label.")

        if count > 0:
            label = trend_indicator.first.get_attribute("aria-label")
            print(f"First trend indicator aria-label: {label}")

        # Verify DashboardListCard "More" link has aria-label
        more_link = page.locator("a[aria-label*='더보기']")
        more_count = more_link.count()
        print(f"Found {more_count} more links with aria-label.")

        if more_count > 0:
            label = more_link.first.get_attribute("aria-label")
            print(f"First more link aria-label: {label}")

        # Take screenshot
        page.screenshot(path="verification/dashboard.png")
        print("Screenshot saved to verification/dashboard.png")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
