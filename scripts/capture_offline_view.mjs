import { chromium } from "playwright";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const screenshotsDir = path.join(projectRoot, "screenshots");
const artifactDir = "C:\\Users\\TUF\\.gemini\\antigravity-ide\\brain\\cba18c5f-c24d-4f14-856a-088133d3b10a";

async function captureOffline() {
  console.log("Starting preview server on port 4192...");
  const preview = spawn("npx", ["vite", "preview", "--port", "4192", "--strictPort"], {
    cwd: projectRoot,
    shell: true,
  });

  await new Promise((r) => setTimeout(r, 3000));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    await page.goto("http://localhost:4192", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const demoBtn = page.locator("text=Instant Demo Access");
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.waitForTimeout(1500);
    }

    await page.waitForSelector(".dashboard-container");

    // Dismiss offline ready toast so view is uncluttered
    const dismissBtn = page.locator(".pwa-toast-btn-dismiss");
    if (await dismissBtn.isVisible()) {
      await dismissBtn.click();
      await page.waitForTimeout(400);
    }

    // Set offline mode
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("offline"));
    });
    await page.waitForTimeout(400);

    // Queue an offline habit
    await page.click(".btn-pwa-trigger:has-text('Queue Offline Habit')");
    await page.waitForTimeout(600);

    // Scroll to section header / habit list so the offline banner, share button, and queued habit are front and center
    await page.evaluate(() => {
      window.scrollTo({ top: 180, behavior: "instant" });
    });
    await page.waitForTimeout(500);

    const buffer = await page.screenshot({ fullPage: false });
    const p1 = path.join(screenshotsDir, "02_app_loading_offline.png");
    const p2 = path.join(artifactDir, "02_app_loading_offline.png");
    fs.writeFileSync(p1, buffer);
    fs.writeFileSync(p2, buffer);
    console.log("Saved updated 02_app_loading_offline.png!");
  } finally {
    await browser.close();
    preview.kill();
  }
}

captureOffline().catch(console.error);
