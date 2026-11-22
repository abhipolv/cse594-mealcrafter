import { expect, test } from "@playwright/test";

// Needs a seeded database (pnpm db:seed) and AI_MODE=mock.
test("Sam can log in and sees Home", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Your study code").fill("sam-demo");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Sam");
  await expect(page.getByRole("link", { name: "What can I cook now?" })).toBeVisible();
  await expect(page.getByText("4 items need your check")).toBeVisible();
  await expect(page.getByText("Spinach and feta pasta")).toBeVisible();

  await page.getByRole("link", { name: "Fridge" }).click();
  await expect(page.getByRole("heading", { name: "Your fridge" })).toBeVisible();
});

test("model routes refuse requests without a login", async ({ request }) => {
  const res = await request.post("/api/events", { data: {} });
  expect(res.status()).toBe(401);
});
