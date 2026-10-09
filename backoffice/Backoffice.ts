import assert from 'assert';
import { Locator, Page } from 'fixtures';
import EditorArea from './EditorArea';
import ListingArea from './ListingArea';
import MainNav from './MainNav';
import Modal from './Modal';

export type Cockpit = 'Administration Cockpit' | 'Customer Support' | 'Product Cockpit';

const noop = () => { };

export default class Backoffice {
    readonly mainNav: MainNav;
    readonly listing: ListingArea;
    readonly editor: EditorArea;

    readonly accountInput: Locator;
    readonly passwordInput: Locator;
    readonly signInBtn: Locator;
    readonly proceedBtn: Locator;
    readonly forgotPasswordBtn: Locator;
    readonly usernameInput: Locator;
    readonly submitBtn: Locator;
    readonly newPasswordInput: Locator;
    readonly confirmPasswordInput: Locator;
    readonly signOutBtn: Locator;

    readonly systemBar: Locator;
    readonly cockpitDropdown: Locator;
    readonly userRoleSelector: Locator;
    readonly userProfileBtn: Locator;

    readonly messageBox: Locator;
    readonly modal: Modal;

    constructor(readonly page: Page) {
        this.mainNav = new MainNav(page.locator('.yw-explorerTree-sideNavigation:visible'));
        this.listing = new ListingArea(this, page.locator('.yw-collapsibleContainer-caption:has(.yw-com_hybris_cockpitng_advancedsearch):visible'));
        this.editor = new EditorArea(this, page.locator('.yw-editorarea-body:visible'));

        this.accountInput = page.getByRole('textbox', { name: 'Enter user name' });
        this.passwordInput = page.getByRole('textbox', { name: 'Enter password' });
        this.signInBtn = page.getByRole('button', { name: 'Sign In' });
        this.proceedBtn = page.getByRole('button', { name: 'PROCEED' });
        this.forgotPasswordBtn = page.getByRole('button', { name: 'Forgot Password' });
        this.usernameInput = page.locator('#username');
        this.submitBtn = page.getByRole('button', { name: 'Submit' });
        this.newPasswordInput = page.locator('input[name="password"]');
        this.confirmPasswordInput = page.locator('input[name="confirm_password"], input[name="confirmPassword"]');
        this.signOutBtn = this.page.getByText('Sign Out');

        this.systemBar = this.page.locator('.yw-com_hybris_cockpitng_widgets_common_systembar:visible');
        this.cockpitDropdown = this.systemBar.getByTitle('More Perspectives');
        this.userRoleSelector = page.getByTitle('User Role Chooser');
        this.userProfileBtn = page.getByTitle('User Profile');

        this.messageBox = page.locator('.yw-widget-modal-messagebox:visible');
        this.modal = new Modal(this);
    }

    async open(options = { reload: true }): Promise<void> {
        const context = this.page.context();
        for (let tries = 1; tries <= 3; tries++) {
            try {
                if (options.reload || !this.page.url().includes('/backoffice')) {
                    await this.page.goto(context.boURL);
                }
                break;
            } catch (error) {
                if (tries == 3) throw error;
                await this.page.waitForTimeout(tries * 2000);
            }
        }
        for (let i = 1; i <= 3; i++) {
            const state = await this.page.waitForFunction(() => {
                if (document.querySelector('.maintenance-img')) throw new Error('Backoffice in maintenance, please try again later');
                if (location.pathname.includes('custom-login')) return 'login';
                if (!!document.querySelector('.yw-roleselector-container:not([style*="none"])')) return 'role';
                const btn = document.querySelector('[title="User Profile"]');
                return btn && btn.getBoundingClientRect().width > 0;
            }, null, { polling: 3000 }).then(r => r.jsonValue());
            if (state == 'login') {
                await this.login(context.boInfo!.account, context.boPassword);
                continue;
            }
            if (state == 'role') {
                await this.selectRole(context.boInfo!.role);
                continue;
            }
            console.log('Logged in successfully');
            return;
        }
        throw 'Failed to login to backoffice';
    }

    password(account: string) {
        const cluster = this.page.context().profile.cluster;
        const passwordEnv = `${account.toUpperCase()}_${cluster}_PASSWORD`;
        assert(process.env[passwordEnv], `Backoffice password ${passwordEnv} is not set`);
        return process.env[passwordEnv]!;
    }

    async login(account: string, password: string) {
        console.log('Login to backoffice');
        await this.accountInput.fill(account);
        await this.page.waitForTimeout(2000);
        await this.passwordInput.fill(password);
        await this.page.waitForTimeout(2000);
        const btn = await this.signInBtn.elementHandle();
        await this.signInBtn.click();
        await btn?.waitForElementState('hidden').catch(noop);
    }

    async logout() {
        await this.userProfileBtn.click();
        await this.signOutBtn.click();
        await this.accountInput.isVisible();
        console.log('Logout succesfully');
    }

    async selectRole(role?: string) {
        if (role) {
            console.log(`Selecting role: ${role}`);
            await this.page.locator('.yw-roleselector-container').getByText(role).click();
        } else {
            console.log('Selecting first role');
            await this.page.locator('.yw-roleselector-container').getByRole('row').first().click();
        }
        const btn = await this.proceedBtn.elementHandle();
        await this.proceedBtn.click();
        await btn?.waitForElementState('hidden').catch(noop);
    }

    async forgotPassword(account: string) {
        console.log('Initiating forgot password flow');
        await this.forgotPasswordBtn.click();
        await this.usernameInput.fill(account);
        await this.submitBtn.click();
        console.log('Password reset email sent');
    }

    async changePassword(newPassword: string) {
        console.log('Changing password');
        await this.newPasswordInput.fill(newPassword);
        await this.confirmPasswordInput.fill(newPassword);
        await this.submitBtn.click();
        console.log('Password changed successfully');
    }

    async changeRole(role: string) {
        await this.userRoleSelector.click();
        const opt = this.page.locator('.yw-roleChooser-popup').getByRole('row', { name: role });
        if (await opt.evaluate((e: any) => e.ariaSelected == 'true')) {
            await opt.click({ force: true, position: { x: -4, y: 0 } });
        } else {
            await opt.click();
        }
        while (await opt.isVisible()) await this.page.waitForTimeout(3000);
        await this.waitForLoading();
    }

    async switchCockpit(cockpit: Cockpit) {
        const breadcrumb = this.page.locator('.yw-perspective-breadcrumb');
        while (!await breadcrumb.isVisible()) await this.page.waitForTimeout(3000);
        const current = await breadcrumb.innerText();
        if (current.includes(cockpit)) return;
        await this.cockpitDropdown.click();
        await this.page.locator('.yw-perspective-popup-level0').getByText(cockpit).click();
        while (!await this.page.locator('.yw-perspective-popup-level0').first().isVisible()) await this.page.waitForTimeout(3000);
        await this.waitForLoading();
    }

    async runCronjob(cronjob: string) {
        console.log(`Running cronjob ${cronjob}`);
        await this.mainNav.openCronjob();
        await this.listing.basicSearch(cronjob);
        await this.listing.selectFirst();
        await this.editor.runCronjobBtn.click();
        const btn = await this.modal.yesBtn.elementHandle();
        await this.modal.yesBtn.click();
        await btn?.waitForElementState('hidden').catch(noop);
    }

    /** Open System > Types and list TokoConfigProperty entries. */
    async navigateToTokoConfig() {
        await this.mainNav.openTypes();
        await this.listing.basicSearch('TokoConfigProperty');
        await this.listing.select('Identifier', 'TokoConfigProperty');
        await this.editor.searchByType.click();
    }

    /** Set one TokoConfigProperty attribute; call navigateToTokoConfig() first. */
    async setTokoConfig(property: string, label: string, value: string) {
        await this.listing.basicSearch(property);
        await this.listing.select('Property', property);
        await this.editor.attribute(label).setValue(value);
        await this.editor.saveBtn.click();
        await this.waitForLoading();
    }

    async openOrderEnhanced(mode: 'Advanced Search') {
        for (let tries = 1; tries <= 3; tries++) {
            try {
                await this.mainNav.navigate('Order-Enhanced');
                await this.listing.area.getByRole('tab', { name: mode }).click({ timeout: 5000 });
                break;
            } catch {
                if (tries == 3) throw new Error(`Unable to switch to Order-Enhanced ${mode}`);
                await this.listing.expandCollapseBtn.click({ timeout: 5000 }).catch(() => { });
            }
        }
    }

    async waitForLoading() {
        while (await this.page.locator('.z-loading-indicator').isVisible()) await this.page.waitForTimeout(3000);
    }
}
