import type { Locator } from 'playwright';
import type { Page } from 'fixtures';
import { SplashRHS } from './RHS';
import GNB from 'GNB';

export interface UserAccountModal extends Locator {
    readonly closeBtn: Locator;
    readonly contentText: Locator;
    readonly guestCheckoutBtn: Locator;
    readonly signInBtn: Locator;
}

/**
 * Splash page (Hybrid)
 */
export default class Splash {
    readonly gnb: GNB;
    readonly rhs: SplashRHS;

    readonly signInBtn: Locator;
    readonly signUpLink: Locator;
    readonly emailInput: Locator;
    readonly emailInputError: Locator;
    readonly continueBtn: Locator;

    readonly userAccountModal: UserAccountModal;

    constructor(readonly page: Page) {
        this.rhs = new SplashRHS(page.locator('.RightContentSlot'));
        this.gnb = new GNB(page);

        this.signInBtn = page.locator('[data-an-la="samsung account"]');
        this.signUpLink = page.locator('[data-an-la="sign up"]:visible');
        this.emailInput = page.locator('input[type="email"]');
        this.emailInputError = page.locator('mat-form-field:has([type="email"]) mat-error:visible');
        this.continueBtn = page.locator('[data-an-la="guest"]:visible');

        this.userAccountModal = Object.assign(page.locator('app-user-account-modal'), {
            closeBtn: page.locator('.modal__close'),
            contentText: page.locator('.modal__body p'),
            guestCheckoutBtn: page.locator('[data-an-la*="continue to guest checkout"]'),
            signInBtn: page.locator('[data-an-la*="sign in to checkout"]')
        });
    }

    get url() {
        return this.page.context().splashURL;
    }
}
