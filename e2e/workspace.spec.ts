import { expect, test, type Page } from "@playwright/test";

const password = "KarmKaro#2026";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/today");
}

test("Hinglish quick add previews a structured task before saving", async ({ page }) => {
  const stamp = Date.now();
  await signIn(page, "arjun.mehta@karmkaro.dev");
  await page.getByRole("button", { name: /Quick add|जल्दी जोड़ें/ }).click();
  await page.getByLabel("Describe the task").fill(`Rahul ko kal shaam 5 baje tak client report ${stamp} bhejne ka task do, high priority`);
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByText("Rahul Verma")).toBeVisible();
  await expect(page.locator("select").first()).toHaveValue("1");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.getByLabel("Title")).toHaveValue(new RegExp(String(stamp)));
});

test("admin assigns work and the employee can finish it", async ({ page }) => {
  const title = `Floor note ${Date.now()}`;
  await signIn(page, "arjun.mehta@karmkaro.dev");
  await page.getByRole("button", { name: /Quick add|जल्दी जोड़ें/ }).click();
  await page.getByRole("button", { name: "Write it yourself" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.getByLabel("Title")).toHaveValue(title);
  await page.keyboard.press("Escape");

  await page.goto("/admin/assign");
  await expect(page.getByRole("heading", { name: "Assign work" })).toBeVisible();
  await page.getByRole("checkbox", { name: title }).check();
  await page.getByRole("checkbox", { name: "Rahul Verma" }).check();
  await page.getByRole("button", { name: "Assign" }).click();
  await expect(page.getByText("Assigned")).toBeVisible();

  const denied = await page.request.get("/api/v1/admin/dashboard");
  expect(denied.ok()).toBeTruthy();

  await page.context().clearCookies();
  await signIn(page, "rahul.verma@karmkaro.dev");
  const blocked = await page.request.get("/api/v1/admin/dashboard");
  expect(blocked.status()).toBe(403);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Managers only" })).toBeVisible();
  await page.goto("/assigned");
  await page.getByRole("button", { name: new RegExp(`^${title}`) }).click();
  await page.getByLabel("Comment").fill("Shipped from the floor");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Shipped from the floor")).toBeVisible();
  await page.getByLabel("Status").selectOption("DONE");
  await expect(page.getByLabel("Status")).toHaveValue("DONE");
});
