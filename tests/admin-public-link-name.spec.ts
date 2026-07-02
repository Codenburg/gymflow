import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers";
import { getOrganizationSlug, resetOrganizationSlug } from "./utils/gym-reset";
import { DEFAULT_PUBLIC_ORG_SLUG } from "./public-routing-helpers";
import { normalizePublicLinkName } from "@/lib/tenants/slug";

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

test.afterEach(async () => {
  await resetOrganizationSlug();
});

test("admin can rename the public link and the old path shows a friendly not-found page", async ({ page }) => {
  const rawName = `Mi Gimnasio ${Date.now()}!`;
  const normalizedName = normalizePublicLinkName(rawName);

  await loginAsAdmin(page);
  await page.goto("/admin/config");

  await expect(page.getByRole("heading", { name: "Configuración del Gimnasio" })).toBeVisible({
    timeout: 10_000,
  });

  const nameInput = page.getByLabel("Nombre para el enlace público");
  await expect(page.getByText("Tu sitio público será: /g/gymflow-default")).toBeVisible();
  await nameInput.fill(rawName);
  await expect(page.getByText(`Tu sitio público será: /g/${normalizedName}`)).toBeVisible();

  const saveButton = page.getByRole("button", { name: "Guardar nombre público" });
  await expect(saveButton).toBeDisabled();

  await page.getByLabel(/Entiendo que el enlace público anterior/).check();
  await expect(saveButton).toBeEnabled();

  await saveButton.click();
  await expect(nameInput).toHaveValue(normalizedName, { timeout: 15_000 });
  await page.waitForTimeout(1_500);

  const organizationSlug = await getOrganizationSlug();
  expect(organizationSlug).toBe(normalizedName);

  const cacheBust = Date.now().toString();
  await page.goto(`/g/${DEFAULT_PUBLIC_ORG_SLUG}?bust=${cacheBust}`);
  await expect(page.getByRole("heading", { name: "Gimnasio no encontrado" })).toBeVisible();
  await expect(
    page.getByText("El enlace puede haber cambiado o ya no estar disponible.")
  ).toBeVisible();

  const newResponse = await page.request.get(`/g/${normalizedName}?bust=${cacheBust}`);
  expect(newResponse.status()).toBe(200);

  await resetOrganizationSlug();
});
