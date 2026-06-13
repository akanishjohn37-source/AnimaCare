import asyncio
import os
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:5173"
SCREENSHOT_DIR = r"C:\Users\golde\Desktop\MyProject\MainProject\AnimaCare\screenshots"

os.makedirs(SCREENSHOT_DIR, exist_ok=True)

targets = [
    # Citizen Pages
    {"path": "/medical/all", "user": "Anish", "name": "18_citizen_medical_viewer"},
]

async def capture():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        user_groups = {}
        for t in targets:
            user = t["user"]
            if user not in user_groups:
                user_groups[user] = []
            user_groups[user].append(t)
            
        for user, pages in user_groups.items():
            print(f"Creating browser context for user: {user}...")
            context = await browser.new_context(viewport={"width": 1280, "height": 800})
            page = await context.new_page()
            
            if user is not None:
                print(f"Logging in as {user}...")
                await page.goto(f"{BASE_URL}/login")
                await page.fill("input[name='username']", user)
                await page.fill("input[name='password']", "password123")
                await page.click("button[type='submit']")
                await page.wait_for_timeout(3000)
                
            for p_info in pages:
                url = f"{BASE_URL}{p_info['path']}"
                name = p_info["name"]
                print(f"Navigating to {url} for screenshot: {name}...")
                try:
                    await page.goto(url, wait_until="networkidle", timeout=15000)
                except Exception as e:
                    print(f"Timeout on {url}, taking screenshot anyway. ({e})")
                
                await page.wait_for_timeout(3000)
                
                filename = os.path.join(SCREENSHOT_DIR, f"{name}.png")
                await page.screenshot(path=filename, full_page=False)
                print(f"Saved: {filename}")
                
            await context.close()
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(capture())
