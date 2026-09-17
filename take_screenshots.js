import puppeteer from 'puppeteer';

(async () => {
    console.log("Starting Puppeteer...");
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Mobile Viewport (iPhone 13)
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
        
        // Skip splash and onboarding
        await page.evaluateOnNewDocument(() => {
            localStorage.setItem('ifaqa_has_seen_intro', 'true');
            localStorage.setItem('ifaqa_launched_v69', 'true');
            localStorage.setItem('ifaqa_intro_enabled', 'false');
            localStorage.setItem('v1_beta_popup_seen', 'true');
            localStorage.setItem('kahf_read_date', new Date().toDateString());
            
            // Prevent Athkar Reminder Modal
            const d = new Date();
            const dateStr = `${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
            localStorage.setItem(`ifaqa_athkar_morning_done_${dateStr}`, 'true');
            localStorage.setItem(`ifaqa_athkar_evening_done_${dateStr}`, 'true');
            sessionStorage.setItem('ifaqa_athkar_reminder_dismissed_at', Date.now().toString());
        });

        console.log("Navigating to http://localhost:3000/ ...");
        await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 60000 });
        await new Promise(r => setTimeout(r, 4000));
        
        // Check if login form is present
        const emailInput = await page.$('input[type="email"]');
        if (emailInput) {
            console.log("Login form detected. Logging in...");
            await page.type('input[type="email"]', 'dr.mahmoud.elhenawy@gmail.com');
            await page.type('input[type="password"]', 'DM46085700');
            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 6000));
        }

        const navSelector = 'nav.ifaqa-bottom-nav button[data-navigation]';
        await page.waitForSelector(navSelector, { timeout: 15000 }).catch(() => {});

        const goHome = async () => {
            await page.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 60000 });
            await page.waitForSelector(navSelector, { timeout: 15000 }).catch(() => {});
            await new Promise(r => setTimeout(r, 2000));
        };

        const clickTab = async (index) => {
            const tabs = await page.$$(navSelector);
            if (tabs[index]) {
                await page.evaluate(el => el.click(), tabs[index]);
                await page.waitForNetworkIdle({ idleTime: 1000, timeout: 8000 }).catch(()=>{});
                await new Promise(r => setTimeout(r, 2000));
            }
        };

        const takeSnap = async (name) => {
            await page.screenshot({ path: `screenshots/${name}.png`, fullPage: false });
            console.log(`Saved screenshots/${name}.png`);
        };
        
        const clickByText = async (selector, text) => {
            const clicked = await page.evaluate((sel, txt) => {
                const elements = Array.from(document.querySelectorAll(sel));
                const target = elements.find(el => el.textContent.includes(txt));
                if (target) {
                    target.click();
                    return true;
                }
                return false;
            }, selector, text);
            return clicked;
        };

        // 1. Home
        await takeSnap('01_home');

        // 2. Prayer Times (tab index 1)
        console.log("Capturing Prayer Times and Fajr Alarm...");
        await clickTab(1);
        await takeSnap('02_prayer_times');
        
        // Prayer Times -> Fajr Alarm Settings
        let clicked = await clickByText('button', 'تعديل ❯');
        if (clicked) {
            await new Promise(r => setTimeout(r, 1500));
            await takeSnap('02_fajr_alarm_settings');
            
            // Close settings using Escape key
            await page.keyboard.press('Escape');
            await new Promise(r => setTimeout(r, 1000));
        }

        // 3. Quran (tab index 2)
        console.log("Capturing Quran...");
        await goHome();
        await clickTab(2);
        await takeSnap('03_quran');

        // 4. Azkar (tab index 3)
        console.log("Capturing Azkar...");
        await goHome();
        await clickTab(3);
        await takeSnap('04_azkar');

        // 5. Challenges (tab index 4)
        console.log("Capturing Challenges...");
        await goHome();
        await clickTab(4);
        await takeSnap('05_challenges_daily');
        
        // Prophet Challenge
        clicked = await clickByText('h3', 'تحدي الصلاة على النبي');
        if (clicked) {
            await new Promise(r => setTimeout(r, 1500));
            await takeSnap('05_challenges_prophet_modal');
            await page.keyboard.press('Escape');
            await new Promise(r => setTimeout(r, 1000));
        }

        // Events tab
        clicked = await clickByText('button', 'فعاليات معوان');
        if (clicked) {
            await new Promise(r => setTimeout(r, 1500));
            await takeSnap('05_challenges_events');
        }

        // Ameen tab
        clicked = await clickByText('button', 'حائط الدعاء');
        if (clicked) {
            await new Promise(r => setTimeout(r, 1500));
            await takeSnap('05_challenges_ameen');
        }

        // Rooms tab
        clicked = await clickByText('button', 'قوافل الخير');
        if (clicked) {
            await new Promise(r => setTimeout(r, 1500));
            await takeSnap('05_challenges_rooms');
        }

        // 6. Tools (tab index 5)
        console.log("Capturing Tools...");
        await goHome();
        await clickTab(5);
        await takeSnap('06_tools_main');

        // For tools, there are multiple tool buttons
        const toolBtnsCount = (await page.$$('button.group.w-full')).length;
        console.log(`Found ${toolBtnsCount} tools in Tools Tab.`);
        for(let i=0; i<toolBtnsCount; i++) {
            await goHome();
            await clickTab(5); // goto tools
            const btns = await page.$$('button.group.w-full');
            if (btns[i]) {
                await page.evaluate(el => el.click(), btns[i]);
                await page.waitForNetworkIdle({ idleTime: 1000, timeout: 8000 }).catch(()=>{});
                await new Promise(r => setTimeout(r, 2000));
                
                const toolNames = ['hadith', 'calendar', 'radio', 'qibla', 'masbaha', 'downloads'];
                await takeSnap(`06_tool_${toolNames[i] || (i+1)}`);
            }
        }
        
        console.log("All screenshots captured successfully in 'screenshots' folder.");
    } catch (e) {
        console.error("Error during Puppeteer execution:", e);
    } finally {
        await browser.close();
    }
})();
