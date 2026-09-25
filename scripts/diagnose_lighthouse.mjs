import lighthouse from "lighthouse";
import { chromium } from "playwright";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

async function check() {
  const previewProcess = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], {
    cwd: projectRoot,
    shell: true,
  });

  await new Promise((r) => setTimeout(r, 3000));

  const browser = await chromium.launch({
    headless: true,
    args: ["--remote-debugging-port=9222"],
  });

  try {
    const result = await lighthouse("http://localhost:4173", {
      port: 9222,
      output: "json",
      onlyCategories: ["accessibility", "seo"],
    });

    const audits = result.lhr.audits;
    console.log("=== FAILING ACCESSIBILITY AUDITS ===");
    for (const [key, audit] of Object.entries(audits)) {
      if (audit.score !== null && audit.score < 1) {
        console.log(`[${key}]: ${audit.title} (score: ${audit.score})`);
        console.log(`  Details: ${audit.explanation || audit.description}`);
        if (audit.details?.items) {
          console.log(`  Items:`, audit.details.items.map((i) => i.node?.snippet || i.node?.selector));
        }
      }
    }
  } finally {
    await browser.close();
    previewProcess.kill();
  }
}

check().catch(console.error);
