import { BrowserContext, Page } from 'playwright/test';

export async function createTempEmail(context: BrowserContext): Promise<[Page, string]> {
    const page = await context.newPage();
    const name = 'wwauto' + new Date().getTime();
    const email = name + '@teml.net';
    await page.goto('https://moakt.com');
    await page.getByRole('textbox', { name: 'your mail name !' }).fill(email);
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.getByText('Message Title').first().waitFor();
    return [page, email];
}

export async function getOTPCode(page: Page): Promise<string> {
    await page.bringToFront();
    const otp = page.locator('.email-body').getByText(/\b\d\d\d\d\d\d\b/);
    for (let i = 0; i < 12; i++) {
        try {
            for (const link of await page.locator('.email-messages td:first-child a').all()) {
                await link.click();
                try {
                    await otp.waitFor({ timeout: 5000 });
                    const text = await otp.innerText();
                    return text.replaceAll(/[^\d]/g, '').trim();
                } catch (ignore) {
                    await page.getByRole('link', { name: 'Go back' }).first().click();
                }
            }
            await page.getByRole('link', { name: 'Refresh' }).click();
            await new Promise(r => setTimeout(r, 5000));
        } catch (ignore) { }
    }
    throw new Error('Unable to get OTP code from moakt.com');
}
