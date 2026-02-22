from playwright.sync_api import sync_playwright, expect

def test_dashboard_links(page):
    # Mock /api/v1/health
    page.route("**/api/v1/health", lambda route: route.fulfill(status=200, body='{"status": "UP"}'))

    # Mock /auth/me
    page.route("**/auth/me", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"success": true, "user": {"id": "user1", "name": "User One", "role": "USER"}}'
    ))

    # Mock /dashboard - Flat structure as expected by DashboardController
    page.route("**/dashboard", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"success": true, "taskList": [{"nttId": 101, "bbsId": "BBSMSTR_CCCCCCCCCCCC", "nttSj": "Task 1", "frstRegisterPnttmStr": "2025-05-20"}], "notiList": [{"nttId": 201, "bbsId": "BBSMSTR_AAAAAAAAAAAA", "nttSj": "Notice 1", "frstRegisterPnttmStr": "2025-05-21"}]}'
    ))

    # Mock /vacations/yearly-leaves/my - Wrapped in data property
    page.route("**/vacations/yearly-leaves/my**", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"success": true, "data": {"remndrYrycCo": 15}}'
    ))

    # Navigate to dashboard
    page.goto("http://localhost:3000")

    # Wait for dashboard content
    page.wait_for_selector("text=User One")

    # Wait for list items to render
    page.wait_for_selector("text=Task 1")
    page.wait_for_selector("text=Notice 1")

    # Locate the link for Task 1
    task_link = page.get_by_role("link", name="Task 1 상세보기")
    expect(task_link).to_be_visible()
    expect(task_link).to_have_attribute("href", "/cop/bbs/101?bbsId=BBSMSTR_CCCCCCCCCCCC")

    # Locate the link for Notice 1
    notice_link = page.get_by_role("link", name="Notice 1 상세보기")
    expect(notice_link).to_be_visible()
    expect(notice_link).to_have_attribute("href", "/cop/bbs/201?bbsId=BBSMSTR_AAAAAAAAAAAA")

    # Screenshot
    page.screenshot(path="verification/verification.png")
    print("Verification successful!")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_dashboard_links(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()
