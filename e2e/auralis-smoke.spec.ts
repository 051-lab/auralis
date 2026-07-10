import { expect, test } from '@playwright/test';

test.describe('Auralis dashboard smoke', () => {
  test('loads the styled dashboard and core controls', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Auralis' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start audio playback' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Master Chain' })).toBeVisible();
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

  test('starts and fades audio back to standby', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Start audio playback' }).click();
    await expect(page.getByRole('button', { name: 'Stop audio playback' })).toBeEnabled();
    await expect(page.getByText('● LIVE')).toBeVisible();

    await page.getByRole('button', { name: 'Stop audio playback' }).click();
    await expect(page.getByText('○ STANDBY')).toBeVisible({ timeout: 6_000 });
  });

  test('isolates and restores strict binaural carrier state', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Toggle noise layer').click();
    await page.getByLabel('Toggle texture layer').click();
    await page.getByLabel('Toggle master EQ').click();
    await page.getByLabel('Toggle delay').click();
    await page.getByLabel('Toggle chorus').click();

    await page.getByRole('button', { name: /Activate Alpha Focus binaural preset/ }).click();
    await page.getByRole('button', { name: "I’m Using Headphones" }).click();

    await expect(page.getByText(/Binaural Lock is active/)).toBeVisible();
    await expect(page.getByLabel('Toggle noise layer')).toBeDisabled();
    await expect(page.getByLabel('Toggle texture layer')).toBeDisabled();
    await expect(page.getByLabel('Toggle master EQ')).toBeDisabled();
    await expect(page.getByLabel('Toggle delay')).toBeDisabled();
    await expect(page.getByLabel('Toggle chorus')).toBeDisabled();

    await page.getByRole('button', { name: 'Exit Binaural Mode' }).click();

    await expect(page.getByLabel('Toggle noise layer')).toBeEnabled();
    await expect(page.getByLabel('Toggle noise layer')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Toggle texture layer')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Toggle master EQ')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Toggle delay')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Toggle chorus')).toHaveAttribute('aria-pressed', 'true');
  });

  test('tracks loaded preset identity and marks control edits', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Load preset Alpha Relaxed Focus (10Hz)' }).click();
    await expect(page.getByText('Alpha Relaxed Focus (10Hz)', { exact: true }).first()).toBeVisible();

    await page.getByLabel('Oscillator 1 frequency in hertz').fill('225');
    await expect(page.getByText('Alpha Relaxed Focus (10Hz) · Modified')).toBeVisible();
  });

  test('saves, loads, deletes, and shares a custom preset', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');

    await page.getByPlaceholder('Preset name...').fill('Browser QA Preset');
    await page.getByRole('button', { name: 'Save current settings as preset' }).click();
    await expect(page.getByRole('button', { name: 'Load preset Browser QA Preset' })).toBeVisible();

    await page.getByRole('button', { name: 'Load preset Browser QA Preset' }).click();
    await page.getByRole('button', { name: 'Copy share link for current settings' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('?preset=v2.');

    await page.getByRole('button', { name: 'Delete preset Browser QA Preset' }).click();
    await expect(page.getByRole('button', { name: 'Load preset Browser QA Preset' })).toHaveCount(0);
  });

  test('finalizes a recording to pending export when playback stops', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Start audio playback' }).click();
    await page.getByRole('button', { name: /Start wet recording/i }).click();
    await expect(page.getByText('REC WET')).toBeVisible();

    await page.getByRole('button', { name: 'Stop audio playback' }).click();
    await expect(page.getByText('Pending Export', { exact: true })).toBeVisible({ timeout: 8_000 });
    await page.getByRole('button', { name: 'Discard' }).click();
    await expect(page.getByText('Pending Export', { exact: true })).toHaveCount(0);
  });

  test('completes the development timer and returns to standby', async ({ page }) => {
    test.setTimeout(35_000);
    await page.goto('/');

    await page.getByRole('button', { name: 'Start audio playback' }).click();
    await page.getByRole('button', { name: 'Set timer for 10s' }).click();

    await expect(page.getByText('Session timer complete. Audio faded out smoothly.')).toBeVisible({
      timeout: 24_000,
    });
    await expect(page.getByText('○ STANDBY')).toBeVisible();
  });

  test('uses accessible collapsible racks on mobile without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const masterDisclosure = page.getByRole('button', { name: 'Master Chain Controls' });
    await expect(masterDisclosure).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByLabel('Toggle noise layer')).toBeHidden();
    await masterDisclosure.click();
    await expect(masterDisclosure).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByLabel('Toggle noise layer')).toBeVisible();

    const oscillatorDisclosure = page
      .getByRole('button', { name: 'Advanced Controls' })
      .first();
    await expect(oscillatorDisclosure).toHaveAttribute('aria-expanded', 'false');
    await oscillatorDisclosure.click();
    await expect(page.getByLabel('Oscillator 1 detune cents')).toBeVisible();

    await page.getByRole('button', { name: 'Creator Session Fields' }).click();
    await expect(page.getByLabel('Creator target duration in minutes')).toBeVisible();
    await page.getByRole('button', { name: /Preset Results/ }).click();
    await expect(page.getByRole('button', { name: 'Load preset Gamma Neural Binding (40Hz)' })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  });
});
