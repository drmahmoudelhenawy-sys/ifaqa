import { test, expect } from '@playwright/test';

test('capture screenshots', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    
    console.log("Navigating to http://localhost:3000/");
    await page.goto('http://localhost:3000/');
    
    // Wait for splash screen
    await page.waitForTimeout(4000);
    
    // Attempt login
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
        console.log("Login form detected. Logging in...");
        await emailInput.fill('dr.mahmoud.elhenawy@gmail.com');
        await page.locator('input[type="password"]').fill('DM46085700');
        await page.keyboard.press('Enter');
        console.log("Submitted login form.");
        
        // Wait for app to load after login
        await page.waitForTimeout(6000);
    } else {
        console.log("No login form detected. Assuming already logged in.");
    }
    
    console.log("Taking screenshot of Home...");
    await page.screenshot({ path: 'screenshots/0_home.png' });

    console.log("Finding navigation tabs...");
    const tabs = page.locator('button[data-navigation]');
    const count = await tabs.count();
    console.log(`Found ${count} tabs.`);
    
    for (let i = 0; i < count; i++) {
        console.log(`Clicking tab ${i+1}...`);
        await tabs.nth(i).click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `screenshots/tab_${i + 1}.png` });
    }
});
