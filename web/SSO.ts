import assert from 'assert';
import { Locator } from 'playwright';
import type { Page } from 'fixtures';

const ignoreError = () => { };

/**
 * Samsung SSO service
 */
export default class SSO {
    readonly accountInput: Locator;
    readonly passwordInput: Locator;
    readonly signInBtn: Locator;
    readonly nextBtn: Locator;
    readonly createAccountBtn: Locator;
    readonly accountInputError: Locator;

    readonly termAndConditionsCbxs: Locator;
    readonly agreeBtn: Locator;
    readonly notNowBtn: Locator;

    readonly firstNameInput: Locator;
    readonly lastNameInput: Locator;
    readonly dayInput: Locator;
    readonly monthSelect: Locator;
    readonly yearInput: Locator;
    readonly confirmPasswordInput: Locator;
    readonly signUpBtn: Locator;

    readonly otpInput: Locator;
    readonly otpInputError: Locator;

    readonly doneBtn: Locator;

    constructor(readonly page: Page) {
        this.accountInput = page.locator('[name="account"]');
        this.passwordInput = page.locator('[id="password"]');
        this.signInBtn = page.locator('[data-log-id="signin"]:visible');
        this.nextBtn = page.locator('[data-log-id="next"]:visible').first();
        this.createAccountBtn = page.locator('[data-log-id="create-account"]');
        this.accountInputError = page.locator('#account-helper-text');

        this.termAndConditionsCbxs = page.getByRole('checkbox').and(page.locator('#all'));
        this.agreeBtn = page.locator('[data-log-id="agree"]:visible, [data-log-id="continue"]');
        this.notNowBtn = page.locator('[data-log-id="not-now"]:visible');

        this.firstNameInput = page.locator('[name="firstName"]');
        this.lastNameInput = page.locator('[name="lastName"]');
        this.dayInput = page.locator('[name="day"]');
        this.monthSelect = page.locator('select#month');
        this.yearInput = page.locator('[name="year"]');
        this.confirmPasswordInput = page.locator('[name="confirmPassword"]');
        this.signUpBtn = page.locator('[data-log-id="create-account"], .sign-in-component__content-footer-desc__link, .guest-login-content-wrapper button, .sign-in-component__content-footer-desc:has([data-an-la="sign up here"]) .reset');

        this.otpInput = page.locator('[name="otp"]');
        this.otpInputError = page.locator('#otp-helper-text');

        this.doneBtn = page.locator('[data-log-id="done"]:visible');
    }

    get loginURL() {
        return 'https://account.samsung.com/iam/oauth2/authorize';
    }

    async autoZoom() {
        await this.page.evaluate(() => {
            document.querySelectorAll('#root > div > *').forEach(
                e => e.removeAttribute('style')
            );
            const zoom = 100 * window.innerHeight / document.body.scrollHeight;
            document.querySelectorAll('#root > div > *').forEach(
                e => e.setAttribute('style', `zoom: ${zoom}%`)
            );
        }).catch(() => { });
    }

    async signInByEmail(email: string, password: string) {
        assert(email, 'SSO email is not setup');
        assert(password, 'SSO password is not setup for ' + email);
        try {
            await this.accountInput.fill(email);
            await this.nextBtn.click();
            await this.passwordInput.fill(password);
            await this.signInBtn.click();
            await this.afterSignInProcess();
        } catch (error) {
            throw new Error('Unable to sign in with email ' + email);
        }
    }

    /** Finish the sign-up flow from the last SSO step back to the store. */
    async completeSignUp() {
        const context = this.page.context();
        await this.doneBtn.click();
        await this.page.waitForURL('**/sign-in/complete');
        await this.page.waitForURL(url =>
            url.toString().startsWith(context.homeURL) || url.toString().startsWith(context.shopURL)
        );
        await this.page.waitForLoadState();
    }

    async afterSignInProcess() {
        await this.page.waitForURL(url =>
            !url.hostname.includes('account.samsung.com') ||
            /change-password|terms|stay-signed-in/.test(url.pathname)
        );
        if (this.page.url().includes('terms')) {
            for (let tries = 1; tries <= 2; tries++) {
                try {
                    for (const cbx of await this.termAndConditionsCbxs.all()) {
                        await cbx.check({ force: true });
                    }
                    const btn = await this.agreeBtn.elementHandle({ timeout: 5000 });
                    await btn!.click({ timeout: 5000 });
                    await btn!.evaluate(e => !document.contains(e));
                    await this.page.waitForTimeout(5000);
                    break;
                } catch (error) {
                    await this.page.waitForTimeout(5000);
                }
            }
        }
        for (const step of ['change-password', 'stay-signed-in']) {
            if (this.page.url().includes(step)) {
                for (let tries = 1; tries <= 2; tries++) {
                    try {
                        const btn = await this.notNowBtn.elementHandle({ timeout: 5000 });
                        await btn!.click({ timeout: 5000 });
                        await btn!.evaluate(e => !document.contains(e));
                        await this.page.waitForTimeout(5000);
                        break;
                    } catch (error) {
                        await this.page.waitForTimeout(5000);
                    }
                }
            }
        }
        await this.page.waitForURL(url => !url.hostname.includes('account.samsung.com'));
        this.page.context().ssoSignedIn = true;
        await this.page.waitForLoadState();
        await this.page.addLocatorHandler(
            this.page.locator('#layerPrivacy:visible'),
            async (l) => {
                if (['ES'].includes(this.page.context().site.toUpperCase())) {
                    await l.locator('#privacy-terms').check({ force: true });
                    await l.locator('#privacyBtn').click();
                    return;
                }
                await l.locator('.layer-popup__close:visible').click({ force: true });
            }
        ).catch(ignoreError);
    }
}
