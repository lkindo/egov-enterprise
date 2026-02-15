import os
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Debug requests
    page.on("request", lambda request: print("Request:", request.url))
    page.on("console", lambda msg: print("Console:", msg.text))

    # Mock API responses
    # 1. Auth check
    page.route("**/api/v1/auth/me", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"success": true, "user": {"id": "test", "name": "Test User", "userSe": "USR"}}'
    ))

    # 2. Dashboard data
    page.route("**/api/v1/dashboard", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"success": true, "data": {"success": true, "taskList": [], "notiList": []}}'
    ))

    # 3. Vacation data
    page.route("**/api/v1/vacations/yearly-leaves/my**", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"success": true, "data": {"remndrYrycCo": 15}}'
    ))

    # 4. Health check
    page.route("**/api/v1/health", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"status": "ok"}'
    ))

    print("Navigating to dashboard...")
    page.goto("http://localhost:3000")

    print("Waiting for dashboard to load...")
    # Wait for the user greeting to ensure we are logged in
    try:
        expect(page.get_by_text("안녕하세요, Test User님!")).to_be_visible(timeout=5000)
    except AssertionError:
        print("Timeout waiting for greeting. Taking debug screenshot.")
        page.screenshot(path="debug_failed_login.png")
        raise

    print("Checking 'Vacation Request' button...")
    vacation_link = page.get_by_role("link", name="휴가 신청")
    expect(vacation_link).to_be_visible()
    expect(vacation_link).to_have_attribute("href", "/cop/smt/vct")

    print("Checking 'Write Post' button...")
    post_link = page.get_by_role("link", name="게시글 작성")
    expect(post_link).to_be_visible()
    expect(post_link).to_have_attribute("href", "/cop/bbs")

    print("Taking screenshot...")
    os.makedirs("/home/jules/verification", exist_ok=True)
    page.screenshot(path="/home/jules/verification/verification.png")

    print("Verification complete!")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
