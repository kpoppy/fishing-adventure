import { test, expect } from "@playwright/test";

test("Guardian defense HUD is visible on load", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("hud-wave")).toHaveText("웨이브: 1/4");
  await expect(page.getByTestId("hud-boss")).toHaveText("보스 HP: -");
  await expect(page.getByTestId("hud-life")).toHaveText("생명: 3");
  await expect(page.getByTestId("hud-ult")).toHaveText("광패 게이지: 0%");
  await expect(page.getByTestId("hud-time")).toHaveText(/시간: \d+\.\ds/);
  await expect(page.getByTestId("hud-best")).toHaveText("베스트: -");
  await expect(page.getByTestId("hud-kills")).toHaveText("처치: 0");
  await expect(page.getByTestId("hud-guardians")).toHaveText("고도리 HP: 100|100|100");
  await expect(page.getByTestId("hud-skill")).toHaveText("수호진: READY");
  await expect(page.getByTestId("hud-state")).toHaveText(/상태: RUNNING|상태: BOSS/);
  await expect(page.getByTestId("objective")).toContainText("쌍피장군");
  await expect(page.locator("canvas")).toBeVisible();
});

test("Control input keeps state stable", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(280);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.press("KeyF");
  await page.keyboard.press("KeyE");
  await expect(page.getByTestId("hud-state")).not.toContainText("LOSE");
});
