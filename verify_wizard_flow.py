from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:5174')
    page.wait_for_load_state('networkidle')

    # Login to Admin panel
    page.fill('input[type="text"]', 'admin@filloptech.com')
    page.fill('input[type="password"]', 'admin123')
    page.click('button[type="submit"]')
    page.wait_for_timeout(1000)

    # Click "Upload Questions" in sidebar
    page.click('text="Upload Questions"')
    page.wait_for_timeout(500)

    # Step 1 -> Step 2
    page.click('text="Next: Select Subject"')
    page.wait_for_timeout(500)

    # Step 2 -> Step 3
    page.click('text="Next: Select/Create Topic"')
    page.wait_for_timeout(500)

    page.screenshot(path='/home/jules/verification/wizard_step3_before_add.png')
    print('At Step 3 successfully')

    # Click "+ Add Topic"
    page.click('button:has-text("Add Topic")')
    page.wait_for_timeout(500)

    # Fill in topic name
    page.fill('input[placeholder="e.g. Organic Chemistry"]', 'Advanced Calculus')
    page.click('button:has-text("Save & Select")')
    page.wait_for_timeout(500)

    page.screenshot(path='/home/jules/verification/wizard_step3_after_add.png')

    # Verify "Next: Upload File" button is enabled and click it
    next_btn = page.query_selector('button:has-text("Next: Upload File")')
    is_disabled = next_btn.is_disabled()
    print('Next button disabled state after adding topic:', is_disabled)

    if not is_disabled:
        next_btn.click()
        page.wait_for_timeout(500)
        page.screenshot(path='/home/jules/verification/wizard_step4.png')
        print('Navigated to Step 4 successfully!')

    browser.close()
