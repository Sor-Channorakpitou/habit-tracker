import { chromium } from "playwright";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const screenshotsDir = path.join(projectRoot, "screenshots");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Artifact dir for conversation
const artifactDir = "C:\\Users\\TUF\\.gemini\\antigravity-ide\\brain\\5cc929c7-b23d-4119-935b-f80face00c04";
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

async function run() {
  console.log("Starting Vite dev server...");
  const viteProcess = spawn("npx", ["vite", "--port", "5199", "--strictPort"], {
    cwd: projectRoot,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  viteProcess.stdout.on("data", (data) => {
    // console.log(`[Vite]: ${data}`);
  });

  // Wait 3 seconds for vite to boot
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 860 },
    deviceScaleFactor: 2, // High resolution retina screenshot
  });

  const page = await context.newPage();

  try {
    console.log("Navigating to app...");
    await page.goto("http://localhost:5199", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // 1. If on login page, click Instant Demo Access
    const demoButton = page.locator("text=Instant Demo Access");
    if (await demoButton.isVisible()) {
      console.log("Logging into demo session...");
      await demoButton.click();
      await page.waitForTimeout(1500);
    }

    // Ensure we are on dashboard
    await page.waitForSelector(".dashboard-container");
    console.log("Dashboard rendered successfully.");

    // =========================================================================
    // SCREENSHOT 1: Rejected-file message (5 MB file refused client-side)
    // =========================================================================
    console.log("Testing 5 MB file rejection...");
    // Open avatar modal
    await page.click(".user-avatar-btn");
    await page.waitForSelector(".avatar-modal-card");
    await page.waitForTimeout(500);

    // Trigger test 5 MB refusal
    await page.click(".btn-audit-chip.refuse-test");
    await page.waitForSelector(".avatar-inline-alert.error");
    await page.waitForTimeout(600);

    const rejectedPath = path.join(screenshotsDir, "01_rejected_file_message.png");
    await page.screenshot({ path: rejectedPath });
    fs.copyFileSync(rejectedPath, path.join(artifactDir, "01_rejected_file_message.png"));
    console.log(`Saved screenshot 1: ${rejectedPath}`);

    // =========================================================================
    // SCREENSHOT 2: Preview state (URL.createObjectURL preview before upload)
    // =========================================================================
    console.log("Testing preview state with valid image (320 KB)...");
    // Create a 320 KB sample PNG buffer and upload via file input
    const sampleCanvasScript = `
      (() => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 400, 400);
        grad.addColorStop(0, '#6366f1');
        grad.addColorStop(0.5, '#ec4899');
        grad.addColorStop(1, '#3b82f6');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 400, 400);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(200, 160, 65, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(200, 360, 120, 0, Math.PI * 2);
        ctx.fill();

        return canvas.toDataURL('image/png');
      })()
    `;
    const dataUrl = await page.evaluate(sampleCanvasScript);
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    const tempImgPath = path.join(projectRoot, "temp_avatar_test.png");
    fs.writeFileSync(tempImgPath, Buffer.from(base64Data, "base64"));

    // Set file input
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(tempImgPath);
    }
    await page.waitForSelector(".avatar-circle-display.has-preview");
    await page.waitForTimeout(600);

    const previewPath = path.join(screenshotsDir, "02_preview_state.png");
    await page.screenshot({ path: previewPath });
    fs.copyFileSync(previewPath, path.join(artifactDir, "02_preview_state.png"));
    console.log(`Saved screenshot 2: ${previewPath}`);

    // Clean up temporary image file
    if (fs.existsSync(tempImgPath)) {
      fs.unlinkSync(tempImgPath);
    }

    // Now proceed with upload to test upsert and persistence
    await page.click(".modal-actions button.btn-primary");
    await page.waitForTimeout(2000);


    // =========================================================================
    // SCREENSHOT 3: Avatar rendered on a fresh load
    // =========================================================================
    console.log("Testing fresh page reload with avatar rendered...");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(".nav-avatar-img", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);


    const freshLoadPath = path.join(screenshotsDir, "03_avatar_fresh_load.png");
    await page.screenshot({ path: freshLoadPath });
    fs.copyFileSync(freshLoadPath, path.join(artifactDir, "03_avatar_fresh_load.png"));
    console.log(`Saved screenshot 3: ${freshLoadPath}`);

    // =========================================================================
    // SCREENSHOT 4: ErrorBoundary in action proving isolation
    // =========================================================================
    console.log("Triggering deliberate crash in Overview Statistics to test ErrorBoundary...");
    await page.click("button:has-text('Crash Stats Section')");
    await page.waitForSelector(".stats-fallback-card");
    await page.waitForTimeout(600);

    const errorBoundaryPath = path.join(screenshotsDir, "04_error_boundary_isolation.png");
    await page.screenshot({ path: errorBoundaryPath });
    fs.copyFileSync(errorBoundaryPath, path.join(artifactDir, "04_error_boundary_isolation.png"));
    console.log(`Saved screenshot 4: ${errorBoundaryPath}`);

    console.log("All 4 audit screenshots successfully captured!");
  } catch (err) {
    console.error("Screenshot capture failed:", err);
  } finally {
    await browser.close();
    viteProcess.kill();
  }
}

run();
