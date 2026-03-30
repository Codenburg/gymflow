import { test, expect, Page, ConsoleMessage } from "@playwright/test";

const ADMIN_DNI = "11111111";
const ADMIN_PASSWORD = "nando123";

async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("input[id=\"dni\"]", { timeout: 15000 });
  await page.fill("input[id=\"dni\"]", ADMIN_DNI);
  await page.fill("input[id=\"password\"]", ADMIN_PASSWORD);
  await page.click("button[type=\"submit\"]");
  await page.waitForURL("/admin", { timeout: 15000 });
}

test.describe("Drag and Drop - Crear Rutina Page", () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/rutinas/nueva");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText("Día 1")).toBeVisible({ timeout: 10000 });
  });

  test("DND-1: Setup test", async ({ page }) => {
    const agregarDiaBtn = page.getByText("Agregar Día");
    await expect(agregarDiaBtn).toBeVisible();
    await agregarDiaBtn.click();
    await expect(page.getByText("Día 2")).toBeVisible({ timeout: 5000 });
    const day1Header = page.locator("h3:has-text(\"Día 1\")");
    await day1Header.click();
    await page.waitForTimeout(300);
    const agregarEjercicioBtn = page.locator("button:has-text(\"Agregar Ejercicio\")").first();
    await expect(agregarEjercicioBtn).toBeVisible();
    await agregarEjercicioBtn.click();
    await page.waitForTimeout(500);
    console.log("Setup complete");
  });

  test("DND-2: Drag Day 1 and drop between Day 1 and Day 2", async ({ page }) => {
    const consoleLogs: ConsoleMessage[] = [];
    const consoleErrors: ConsoleMessage[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg);
      else consoleLogs.push(msg);
    });
    await page.getByText("Agregar Día").click();
    await page.waitForTimeout(500);
    await expect(page.getByText("Día 2")).toBeVisible({ timeout: 5000 });
    await page.locator("h3:has-text(\"Día 1\")").click();
    await page.waitForTimeout(300);
    await page.locator("button:has-text(\"Agregar Ejercicio\")").first().click();
    await page.waitForTimeout(500);
    consoleLogs.length = 0;
    consoleErrors.length = 0;
    const day1DragHandle = page.locator("[aria-label=\"Arrastrar para reordenar día\"]").first();
    const day2DragHandle = page.locator("[aria-label=\"Arrastrar para reordenar día\"]").nth(1);
    await expect(day1DragHandle).toBeVisible();
    await expect(day2DragHandle).toBeVisible();
    const day1Handle = await day1DragHandle.boundingBox();
    const day2Handle = await day2DragHandle.boundingBox();
    if (!day1Handle || !day2Handle) throw new Error("Could not get bounding boxes");
    console.log("=== DRAG Day1 to middle ===");
    console.log("Day1:", day1Handle, "Day2:", day2Handle);
    const targetX = day1Handle.x + day1Handle.width / 2;
    const targetY = (day1Handle.y + day2Handle.y) / 2;
    await page.mouse.move(day1Handle.x, day1Handle.y);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.move(targetX, targetY, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(1000);
    console.log("=== RESULTS ===");
    for (const log of consoleLogs) console.log("[" + log.type() + "] " + log.text());
    for (const err of consoleErrors) console.log("[" + err.type() + "] " + err.text());
    const visibleText = await page.locator("h3:has-text(\"Día\")").allTextContents();
    console.log("Visible:", visibleText);
  });

  test("DND-3: Drag Day 2 and drop before Day 1", async ({ page }) => {
    const consoleLogs: ConsoleMessage[] = [];
    const consoleErrors: ConsoleMessage[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg);
      else consoleLogs.push(msg);
    });
    await page.getByText("Agregar Día").click();
    await page.waitForTimeout(500);
    await expect(page.getByText("Día 2")).toBeVisible({ timeout: 5000 });
    await page.locator("h3:has-text(\"Día 1\")").click();
    await page.waitForTimeout(300);
    await page.locator("button:has-text(\"Agregar Ejercicio\")").first().click();
    await page.waitForTimeout(500);
    consoleLogs.length = 0;
    consoleErrors.length = 0;
    const day1DragHandle = page.locator("[aria-label=\"Arrastrar para reordenar día\"]").first();
    const day2DragHandle = page.locator("[aria-label=\"Arrastrar para reordenar día\"]").nth(1);
    await expect(day1DragHandle).toBeVisible();
    await expect(day2DragHandle).toBeVisible();
    const day1Handle = await day1DragHandle.boundingBox();
    const day2Handle = await day2DragHandle.boundingBox();
    if (!day1Handle || !day2Handle) throw new Error("Could not get bounding boxes");
    console.log("=== DRAG Day2 to Day1 position ===");
    console.log("Day1:", day1Handle, "Day2:", day2Handle);
    const targetX = day2Handle.x + day2Handle.width / 2;
    const targetY = day1Handle.y;
    await page.mouse.move(day2Handle.x, day2Handle.y);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.move(targetX, targetY, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(1000);
    console.log("=== RESULTS ===");
    for (const log of consoleLogs) console.log("[" + log.type() + "] " + log.text());
    for (const err of consoleErrors) console.log("[" + err.type() + "] " + err.text());
    const visibleText = await page.locator("h3:has-text(\"Día\")").allTextContents();
    console.log("Visible:", visibleText);
  });
});
