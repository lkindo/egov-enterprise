"""
Debug script: 사용자 등록 플로우를 실제로 실행하여
1. 부서 선택 후 드롭다운 DOM 상태 확인
2. 성공 토스트의 정확한 텍스트/클래스 캡처
3. 탭 전환 후 DOM 상태 확인
"""
import time
import json
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:3001"
ADMIN_ID = "webmaster"
ADMIN_PW = "webmaster123"

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # --- LOGIN ---
        print("[1] Logging in...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        page.locator('input[name="userId"], input[type="text"]').first.fill(ADMIN_ID)
        page.locator('input[name="password"], input[type="password"]').first.fill(ADMIN_PW)
        page.locator('button[type="submit"], button:has-text("로그인")').first.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        print(f"[1] After login URL: {page.url}")
        page.screenshot(path="debug_01_after_login.png")

        # --- NAVIGATE TO USER MANAGE ---
        print("[2] Navigating to /admin/user/manage...")
        page.goto(f"{BASE_URL}/admin/user/manage")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        page.screenshot(path="debug_02_user_manage.png")
        print(f"[2] URL: {page.url}")

        # --- OPEN MODAL ---
        print("[3] Clicking '사용자 등록' button...")
        add_btn = page.locator('button:has-text("사용자 등록")').first
        add_btn.click()
        page.wait_for_timeout(2000)
        page.screenshot(path="debug_03_modal_open.png")

        # --- FILL FORM ---
        test_id = "e2e_debug01"
        test_name = "E2E Debug User"
        print("[4] Filling form fields...")
        page.locator('input[name="userId"]').fill(test_id)
        page.locator('input[name="userNm"]').fill(test_name)
        page.locator('input[name="password"]').fill("debug1234!")
        page.locator('input[name="emailAdres"]').fill(f"{test_id}@egov.kr")
        page.screenshot(path="debug_04_form_filled.png")

        # --- INSPECT DEPT DROPDOWN ---
        print("[5] Inspecting department dropdown...")
        dept_locators = page.locator('button, [role="combobox"], select').all()
        for i, loc in enumerate(dept_locators):
            try:
                txt = loc.text_content()
                tag = loc.evaluate("el => el.tagName")
                if "GLOBAL" in (txt or "") or "부서" in (txt or "") or "소속" in (txt or ""):
                    print(f"  [Dept candidate #{i}] tag={tag} text='{txt}'")
            except:
                pass

        # --- SELECT DEPT ---
        print("[6] Selecting department...")
        dept_dropdown = page.locator('button, [role="combobox"]').filter(has_text="GLOBAL").first
        dept_dropdown.click(force=True)
        page.wait_for_timeout(1000)
        page.screenshot(path="debug_05_dept_dropdown_open.png")

        # Check visible options
        options = page.locator('[role="option"], li:has-text("기본조직"), option').all()
        print(f"  [6] Visible options count: {len(options)}")
        for opt in options[:5]:
            try:
                print(f"    option text: '{opt.text_content()}'")
            except:
                pass

        page.keyboard.press("ArrowDown")
        page.wait_for_timeout(500)
        page.keyboard.press("Enter")
        page.wait_for_timeout(1000)
        page.screenshot(path="debug_06_dept_selected.png")

        # Inspect dropdown text after selection
        try:
            dept_text = dept_dropdown.text_content()
            print(f"  [6] Dept dropdown text after selection: '{dept_text}'")
        except Exception as e:
            print(f"  [6] Error reading dept text: {e}")

        # --- CLICK SUBMIT ---
        print("[7] Clicking '신규 등록' submit button...")
        submit_btn = page.locator('button:has-text("신규 등록")').last
        submit_btn.wait_for(state="visible", timeout=15000)
        submit_btn.click(force=True)
        page.wait_for_timeout(3000)
        page.screenshot(path="debug_07_after_submit.png")

        # --- CAPTURE TOAST ---
        print("[8] Inspecting DOM for toast/notification...")
        # Check all visible text on page for success-related keywords
        body_text = page.locator("body").inner_text()
        for line in body_text.split("\n"):
            line = line.strip()
            if any(k in line for k in ["성공", "SUCCESS", "등록", "완료", "error", "오류", "실패"]):
                if len(line) > 2 and len(line) < 200:
                    print(f"  [Toast candidate] '{line}'")

        # Check for any element with toast-related attributes
        toast_candidates = page.locator('[class*="toast"], [class*="alert"], [role="alert"], [role="status"]').all()
        print(f"  [8] Toast candidates count: {len(toast_candidates)}")
        for tc in toast_candidates:
            try:
                print(f"    class='{tc.get_attribute('class')}' text='{tc.text_content()[:100]}'")
            except:
                pass

        # --- CHECK IF MODAL CLOSED ---
        modal_visible = page.locator('text=/신규 사용자 등록/').is_visible()
        print(f"  [8] Modal still open: {modal_visible}")
        print(f"  [8] Current URL: {page.url}")

        # --- TAB SWITCH TEST ---
        print("[9] Testing tab switch - Section_02...")
        page.goto(f"{BASE_URL}/admin/user/manage")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)

        dept_tab = page.locator('button:has-text("Section_02")').first
        dept_tab.wait_for(state="visible", timeout=20000)
        dept_tab.click(force=True)
        page.wait_for_timeout(3000)
        page.screenshot(path="debug_08_section02.png")

        # Capture all visible text in main area after tab switch
        try:
            main_text = page.locator("main").inner_text()
            for line in main_text.split("\n")[:30]:
                line = line.strip()
                if len(line) > 3:
                    print(f"  [Section_02 text] '{line}'")
        except Exception as e:
            print(f"  [9] Error: {e}")

        page.screenshot(path="debug_09_section02_content.png")

        print("[10] Testing tab switch - Section_03...")
        absence_tab = page.locator('button:has-text("Section_03")').first
        absence_tab.click(force=True)
        page.wait_for_timeout(3000)
        page.screenshot(path="debug_10_section03.png")

        try:
            main_text2 = page.locator("main").inner_text()
            for line in main_text2.split("\n")[:30]:
                line = line.strip()
                if len(line) > 3:
                    print(f"  [Section_03 text] '{line}'")
        except Exception as e:
            print(f"  [10] Error: {e}")

        print("[DONE] Debug script completed. Check screenshots.")
        browser.close()

if __name__ == "__main__":
    run()
