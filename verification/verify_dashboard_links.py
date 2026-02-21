from playwright.sync_api import sync_playwright, expect

def test_dashboard_links():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Mock API responses
        # 1. Auth check (returns user directly or inside data?)
        # AuthProvider checks response.data.success and response.data.user
        page.route("**/api/v1/auth/me", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"success": true, "user": {"id": "testuser", "name": "Test User", "userSe": "USR"}}'
        ))

        # 2. Dashboard data - FIXED STRUCTURE
        page.route("**/api/v1/dashboard", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"success": true, "notiList": [{"nttId": 101, "nttSj": "Notice Item 1", "bbsId": "BBSMSTR_AAAAAAAAAAAA", "frstRegisterPnttmStr": "2024-02-20"}], "taskList": [{"nttId": 202, "nttSj": "Task Item 1", "bbsId": "BBSMSTR_CCCCCCCCCCCC", "frstRegisterPnttmStr": "2024-02-21"}]}'
        ))

        # 3. Vacation data
        page.route("**/api/v1/vacations/yearly-leaves/my**", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"success": true, "data": {"remndrYrycCo": 5}}'
        ))

        # 4. Health check
        page.route("**/api/v1/health", lambda route: route.fulfill(status=200))

        # Navigate to dashboard
        page.goto("http://localhost:3000")

        # Wait for dashboard content
        expect(page.get_by_text("환영합니다, Test User님!")).to_be_visible(timeout=10000)

        # Verify Notice Link
        # Note: get_by_role("link", name="...") matches the accessible name (aria-label)
        notice_link = page.get_by_role("link", name="Notice Item 1 - 자세히 보기")
        expect(notice_link).to_be_visible()
        # Check href contains the ID and bbsId
        # Using regex or partial match if needed, but exact match is better if possible
        # My code: /cop/bbs/101?bbsId=BBSMSTR_AAAAAAAAAAAA
        expect(notice_link).to_have_attribute("href", "/cop/bbs/101?bbsId=BBSMSTR_AAAAAAAAAAAA")

        # Verify Task Link
        task_link = page.get_by_role("link", name="Task Item 1 - 자세히 보기")
        expect(task_link).to_be_visible()
        expect(task_link).to_have_attribute("href", "/cop/bbs/202?bbsId=BBSMSTR_CCCCCCCCCCCC")

        # Verify More Link for Notices
        # The aria-label is "최신 공지사항 더보기" (title + " 더보기")
        more_notice_link = page.get_by_role("link", name="최신 공지사항 더보기")
        expect(more_notice_link).to_have_attribute("href", "/cop/bbs?bbsId=BBSMSTR_AAAAAAAAAAAA")

        # Verify More Link for Tasks
        # The aria-label is "오늘의 할일 더보기"
        more_task_link = page.get_by_role("link", name="오늘의 할일 더보기")
        expect(more_task_link).to_have_attribute("href", "/cop/bbs?bbsId=BBSMSTR_CCCCCCCCCCCC")

        # Take screenshot
        page.screenshot(path="verification/verification.png")
        print("Verification successful!")

        browser.close()

if __name__ == "__main__":
    test_dashboard_links()
