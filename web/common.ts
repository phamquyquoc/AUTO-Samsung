import assert from 'assert';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { expect, test, Context, Page, Locator } from 'fixtures';
import GNB from './GNB';
import SSO from './SSO';

const noop = () => { };

assert(process.env.WDS_ID, 'WDS_ID is not set');
assert(process.env.WDS_PASSWORD, 'WDS_PASSWORD is not set');

export async function loginWDS(page: Page, envAEM: string) {
    const wmcNotice = page.locator('[name="wmcNotice"]');
    await page.addLocatorHandler(
        wmcNotice,
        (l) => l.locator('[name="close"]').click()
    ).catch(noop);
    for (let tries = 1; tries <= 2; tries++) {
        try {
            // The AEM session can expire while the WDS one is still alive, and then we come back
            // here to a signed-in portal that has no login image at all - only the env links.
            const signedIn = await page.locator('a[href*="signOut"], img[alt="Sign Out"]')
                .first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
            if (!signedIn) {
                const loginPopupOpened = page.context().waitForEvent('page', { timeout: 10000 }).catch(noop);
                // Bound the click: with the default actionTimeout of 0 a slow WDS page hangs here until
                // the whole test times out, so the retry below never gets its turn.
                await page.locator('.employees img[alt="login"]').click({ timeout: 30000 });
                const loginPopup = await loginPopupOpened as Page;
                try {
                    await loginPopup.locator('[id="userNameInput"]').waitFor({ timeout: 10000 });
                    await loginPopup.waitForTimeout(2000);
                    await loginPopup.locator('[id="userNameInput"]').fill(process.env.WDS_ID!);
                    await loginPopup.locator('[id="passwordInput"]').fill(process.env.WDS_PASSWORD!);
                    await loginPopup.locator('.submitMargin .submit').click();
                    await loginPopup.waitForEvent('close', { timeout: 10000 }).catch(() => loginPopup.close().catch(noop));
                } catch (e: any) {
                    if (!e?.message.includes('browser has been closed')) throw e;
                }
            }
            const newTabOpened = page.context().waitForEvent('page').catch(noop);
            const ENV_MAP: Record<string, string> = {
                'p6-pre-qa': 'Preqa',
                'p6-pre-qa2': 'Preqa2'
            };
            await page.getByRole('link', { name: ENV_MAP[envAEM] }).first().click({ timeout: 10000 });
            const newTab = await newTabOpened as Page;
            await newTab.waitForLoadState();
            await newTab.close().catch(noop);
            await page.removeLocatorHandler(wmcNotice).catch(noop);
            break;
        } catch (cause: any) {
            if (cause?.message.includes('Test ended')) return;
            if (tries == 2) throw new Error('Failed to login to WDS', { cause });
            await page.waitForTimeout(5000);
            console.error('Failed to login to WDS, retrying...');
            await page.reload();
        }
    }
}

export async function login(page: Page) {
    const context = page.context();
    const { email, password } = context.account!;
    const currentURL = page.url();
    const gnb = new GNB(page);
    const sso = new SSO(page);

    await gnb.section.waitFor();
    if (await gnb.userLoggedInIcon.waitFor({ timeout: 5000 }).then(() => true).catch(() => false)) {
        console.log('User is already logged in');
        context.ssoSignedIn = true;
        return;
    }

    console.log('Logging in as', email);
    await gnb.humanIcon.hover();
    await gnb.loginLink.click();
    await expect(page).navigatedTo(sso.loginURL);
    await sso.signInByEmail(email, password);
    console.log('Login success with email', email);
    if (page.url() !== currentURL) {
        await page.goto(currentURL);
    }
    await gnb.section.waitFor();
    await gnb.userLoggedInIcon.waitFor().catch(() => {
        throw new Error('Login Error: loss login session after login');
    });

    const dir = path.join(context.workingDir || path.dirname(test.info().file), '.auth');
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    const id = email.replaceAll(/[^\w]/g, '_').toLowerCase();
    const filename = path.join(dir, id + '.json');
    await context.storageState({ path: filename });
    console.log('Login session saved to', filename);
}

/** Sign out through the GNB account menu. */
export async function logout(page: Page) {
    const gnb = new GNB(page);
    await gnb.hoverHumanIcon();
    await page.waitForTimeout(1000);
    await gnb.logoutLink.click();
    await gnb.logoutLink.waitFor({ state: 'hidden' });
    await page.waitForLoadState();
    page.context().ssoSignedIn = false;
    console.log('Logout success');
}

export async function selectCountry(page: Page) {
    if (page.context().countrySelected) return;
    const gccCountryList = ['BH', 'BH_AR', 'KW', 'KW_AR', 'OM', 'OM_AR', 'QA', 'QA_AR'];
    const currentSite = page.context().site;
    if (!gccCountryList.includes(currentSite)) return;
    const sitePath = currentSite.toLowerCase();
    const url = page.url().toLowerCase();
    if (url.includes(`/${sitePath}/`) || url.includes(`/${sitePath.replace('_', '-')}/`)) return;
    await page.waitForFunction(() => document.querySelector('app-country-selector-modal'));
    await page.waitForSelector('body');
}

export async function handleCountryModal(modal: Locator) {
    const context = modal.page().context() as Context;
    switch (context.site) {
        case 'AE':
        case 'AE_AR':
            await expect(async () => {
                await modal.locator('.modal__close').click();
                await expect(modal).toBeHidden();
            }).toPass({ timeout: 25000 });
            context.countrySelected = true;
            return;
        case 'BH':
            await modal.getByText('Bahrain').click();
            break;
        case 'BH_AR':
            await modal.getByText('البحرين').click();
            break;
        case 'KW':
            await modal.getByText('Kuwait').click();
            break;
        case 'KW_AR':
            await modal.getByText('الكويت').click();
            break;
        case 'OM':
            await modal.getByText('Oman').click();
            break;
        case 'OM_AR':
            await modal.getByText('عمان').click();
            break;
        case 'QA':
            await modal.getByText('Qatar').click();
            break;
        case 'QA_AR':
            await modal.getByText('قطر').click();
            break;
        default:
            return;
    }
    await modal.locator('[data-an-la="country selector popup:continue"]').click();
    await modal.waitFor({ state: 'hidden' });
    context.countrySelected = true;
    await modal.page().waitForLoadState();
}
