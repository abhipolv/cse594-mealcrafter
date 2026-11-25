import { expect, test, type Page } from "@playwright/test";

// Needs a seeded database (pnpm db:seed) and AI_MODE=mock. The tests run in
// order and change Sam's data, so seed again before running them twice.
test.describe.configure({ mode: "serial" });

async function login(page: Page) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Your study code").fill("sam-demo");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Sam");
}

test("Sam can log in and sees Home", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "What can I cook now?" })).toBeVisible();
  await expect(page.getByText("4 items need your check")).toBeVisible();
  await expect(page.getByText("Spinach and feta pasta")).toBeVisible();

  await page.getByRole("link", { name: "Fridge" }).click();
  await expect(page.getByRole("heading", { name: "Your fridge" })).toBeVisible();
});

test("model routes refuse requests without a login", async ({ request }) => {
  const res = await request.post("/api/events", { data: {} });
  expect(res.status()).toBe(401);
  const scan = await request.post("/api/scans", { multipart: { meta: "{}" } });
  expect(scan.status()).toBe(401);
});

test("a review card asks one question and can be undone", async ({ page }) => {
  await login(page);
  await page.goto("/check");
  await expect(page.getByRole("heading", { name: "Check 4 items" })).toBeVisible();
  // Rule-related cards come first; the pesto asks about tree nuts with answers as buttons.
  const pesto = page.getByRole("article").filter({ hasText: "Basil pesto" });
  await expect(pesto.getByText("Does it have tree nuts?")).toBeVisible();
  await pesto.getByRole("button", { name: "Has tree nuts" }).click();
  await expect(page.getByText("Basil pesto: Has tree nuts")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("article").filter({ hasText: "Basil pesto" })).toBeVisible();
});

test("Sam finds a meal, never sees the pesto pasta, and cooks it", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "What can I cook now?" }).click();
  await page.getByRole("button", { name: "Show meals" }).click();
  await expect(page).toHaveURL(/\/cook\/results\?s=/);
  await expect(page.getByRole("heading", { name: /meals? in 20 minutes or less/ })).toBeVisible();
  // The rule filter removed it; it may only appear in "Not shown" (N1).
  await expect(page.getByRole("article").filter({ hasText: "Pesto pasta" })).toHaveCount(0);
  await expect(page.getByText(/Pesto pasta: uses the basil pesto/)).toBeVisible();

  await page.getByRole("article").filter({ hasText: "Veggie egg fried rice" }).getByRole("link", { name: "View recipe" }).click();
  await expect(page.getByRole("heading", { name: "Veggie egg fried rice" })).toBeVisible();
  await expect(page.getByText(/Fits your profile: no peanuts or tree nuts/)).toBeVisible();
  await page.getByRole("link", { name: "I cooked this" }).click();

  await expect(page.getByRole("heading", { name: "Enjoy your dinner" })).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page).toHaveURL(/\/\?cooked=1$/);
  await expect(page.getByText("Saved. Your fridge list is up to date.")).toBeVisible();

  await page.goto("/fridge");
  await expect(page.getByText("Veggie egg fried rice (leftover)")).toBeVisible();
});

test("skipping a planned meal offers a new plan and can be undone", async ({ page }) => {
  await login(page);
  await page.goto("/plan");
  await page.getByRole("link", { name: /Spinach and feta pasta/ }).click();
  await page.getByRole("link", { name: /Skip this meal/ }).click();
  await expect(page.getByText(/only use your answer to plan better weeks/)).toBeVisible();
  await page.getByRole("button", { name: "Eating out" }).click();
  await expect(page.getByRole("heading", { name: /is skipped$/ })).toBeVisible();
  await page.getByRole("button", { name: /Keep the plan as it is/ }).click();
  await expect(page.getByRole("heading", { name: "Plan updated" })).toBeVisible();
  await expect(page.getByText("Skipped: eating out").first()).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByText(/Uses spinach/)).toBeVisible();
});
