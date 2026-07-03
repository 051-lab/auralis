import { expect, test } from '@playwright/test';

test.describe('Auralis dashboard smoke', () => {
  test('loads the styled dashboard and core controls', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Auralis' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start audio playback' })).toBeVisible();
    await expect(page.getByText('Master Chain')).toBeVisible();
    await expect(page.getByText('Texture Layer')).toBeVisible();
    await expect(page.getByText('Modulation')).toBeVisible();

    const backgroundColor = await page.locator('main').evaluate((element) => {
      return window.getComputedStyle(element).backgroundColor;
    });

    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('filters presets by category and search text', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /^Drone\s+\d+/ }).click();
    await expect(page.getByRole('button', { name: 'Load preset Deep Drone Horizon' })).toBeVisible();

    await page.getByPlaceholder('Search presets...').fill('theta');
    await page.getByRole('button', { name: /^Meditation\s+\d+/ }).click();

    await expect(page.getByRole('button', { name: 'Load preset Theta Meditation Gate (6Hz)' })).toBeVisible();
    await expect(page.getByText('Deep Drone Horizon')).toHaveCount(0);
  });

  test('updates modulation and texture controls without layout failure', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Toggle texture layer').click();
    await page.getByLabel('Toggle texture layer').press('Tab');
    await page.locator('select').filter({ hasText: 'RainStormWindOceanDrone' }).selectOption('storm');

    await page.locator('select').filter({ hasText: 'OffGentleBreathingPulseDrift' }).selectOption('breathing');
    await page.getByRole('button', { name: 'Pan', exact: true }).click();

    await expect(page.getByText('Signal Chain')).toBeVisible();
    await expect(page.getByText('Texture', { exact: true })).toBeVisible();
  });

  test('copies creator notes and keeps recorder gated before playback', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');

    await page.getByLabel('Creator target duration in minutes').fill('45');
    await page.getByPlaceholder('Optional export notes...').fill('Smoke test export note.');
    await page.getByRole('button', { name: 'Copy Notes' }).click();

    await expect(page.getByText('Creator session notes copied.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Start wet recording/i })).toBeDisabled();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());

    expect(clipboardText).toContain('Target duration: 45 min');
    expect(clipboardText).toContain('Smoke test export note.');
  });
});
