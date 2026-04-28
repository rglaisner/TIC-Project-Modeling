import { test, expect } from "@playwright/test";

test.describe("Strategic Pitch Architect", () => {
  test("requires passcode for access", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/access/);
    await expect(page.getByText("Secure Access")).toBeVisible();
  });

  test("allows entering with valid passcode", async ({ page }) => {
    await page.goto("/access");
    await page.getByTestId("passcode-input").fill("test-passcode");
    await page.getByTestId("passcode-submit").click();
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Strategic Pitch Architect")).toBeVisible();
  });

  test("runs step one with mocked Gemini response", async ({ page }) => {
    await page.route("**/api/gemini", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ text: "Refined pitch summary from mocked API." }),
      });
    });

    await page.goto("/access");
    await page.getByTestId("passcode-input").fill("test-passcode");
    await page.getByTestId("passcode-submit").click();

    await page.getByTestId("pitch-input").fill("Prototype concept for healthcare operations.");
    await page.getByTestId("pitch-submit").click();

    await expect(page.getByText("Refined pitch summary from mocked API.").first()).toBeVisible();
  });

  test("shows persistence export controls", async ({ page }) => {
    await page.goto("/access");
    await page.getByTestId("passcode-input").fill("test-passcode");
    await page.getByTestId("passcode-submit").click();

    await expect(page.getByTestId("export-json")).toBeVisible();
    await expect(page.getByTestId("export-md")).toBeVisible();
    await expect(page.getByTestId("import-json")).toBeVisible();
  });
});
