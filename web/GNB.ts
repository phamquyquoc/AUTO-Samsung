import type { Locator, Page } from 'playwright';

/**
 * Global Navigation Bar (both AEM and Hybrid)
 */
export default class GNB {
    readonly section: Locator;

    readonly cartIcon: Locator;
    readonly cartItemCount: Locator;
    readonly humanIcon: Locator;
    readonly loginLink: Locator;
    readonly profileMenu: Locator;
    readonly userLoggedInIcon: Locator;
    readonly logoutLink: Locator;

    constructor(private page: Page) {
        this.section = page.locator(`
            nav[aria-label="main navigation"]:visible,
            app-header-global:visible
        `).last();

        this.cartIcon = this.section.locator('[data-an-la="cart"], cx-mini-cart .cart-logo, [an-la*="_cart"]').first();
        this.cartItemCount = this.section.locator('.gnb-cart-count:visible');

        this.humanIcon = this.section.locator(page.locator(`
            .before-login:visible > button:visible,
            .before-login:visible > a:visible,
            .before-login-context:visible > a:visible,
            .after-login:visible > button:visible,
            .after-login:visible > a:visible,
            .after-login-context:visible > a:visible,
            button.has-profile-image,
            button:has([svgicon="user-bold"]):visible
        `)).last();

        this.loginLink = this.section.locator(this.page.locator(`
            [an-la="sign in sign up"]:visible,
            [an-ca="account"][an-la="login"]:visible,
            [data-an-tr="gnb-account"][data-an-la="login"]:visible    
        `).last()).or(this.page.locator('.sso-url.login-signup:visible').first());

        this.profileMenu = this.page.locator('.profile-menu:visible').or(this.page.getByRole('menu')).first();

        this.userLoggedInIcon = this.section.locator(`
            button:has(.js-gnb-afterlogin-no-image):visible,
            button:has(.js-gnb-afterlogin-image):visible,
            a:has(.js-gnb-afterlogin-no-image):visible,
            .loggedInUser:visible,
            [data-login-status="logged in"] [data-an-la="login"],
            [data-login-status="logged in"]
        `).first();
        this.logoutLink = this.page.locator('[data-an-la="logout"]:visible, [an-la="logout"]:visible').last();
    }

    /** Hover the account icon to open the profile menu (login / logout links). */
    async hoverHumanIcon() {
        await this.section.waitFor();
        await this.humanIcon.first().hover();
    }

    /** Open the SSO sign-in page from the GNB account menu. */
    async navigateToSignIn() {
        await this.hoverHumanIcon();
        await this.loginLink.click();
        await this.page.waitForURL(/account\.samsung\.com/);
    }
}
