
import asyncio
from playwright.async_api import async_playwright, expect

async def verify_frontend():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))

        # Navigate
        print("Navigating to http://localhost:3000/login")
        try:
            await page.goto("http://localhost:3000/login", timeout=60000)
        except Exception as e:
            print(f"Navigation failed: {e}")
            await browser.close()
            return

        # Check content
        print("Waiting for login content...")
        try:
            await expect(page.get_by_text("로그인")).to_be_visible(timeout=10000)
            print("Login page loaded successfully.")
            await page.screenshot(path="frontend_login.png")
        except Exception as e:
            print(f"Wait failed: {e}")
            await page.screenshot(path="frontend_error.png")
            content = await page.content()
            print("Page Content Snippet:")
            print(content[:1000])

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_frontend())
