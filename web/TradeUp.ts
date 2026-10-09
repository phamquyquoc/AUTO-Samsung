import { expect, Locator } from 'playwright/test';
import type { Page } from 'fixtures';

export default class TradeUp {
    readonly modal: Locator;
    readonly title: Locator;
    readonly xButton: Locator;

    readonly postalCodeInput: Locator;
    readonly postalCodeCheckBtn: Locator;
    readonly categoryMenu: Locator;
    readonly modelMenu: Locator;
    readonly brandMenu: Locator;
    readonly serialNumberInput: Locator;
    readonly deviceConditions: Locator;
    readonly termsAndConditions: Locator;
    readonly summary: Locator;
    readonly nextBtn: Locator;

    constructor(readonly page: Page) {
        this.modal = page.locator(`
            [class^='trade-up-steps'],
            .vd-trade-in-popup [role="dialog"]
        `);
        this.title = this.modal.locator(page.locator('[class*="popup__title"], .modal__title'));
        this.xButton = this.modal.locator(page.locator('[class*="popup__close"], .modal__close'));

        this.serialNumberInput = this.modal.locator(page.locator('input[formcontrolname="serialFormControl"]:visible'));
        this.postalCodeInput = this.modal.locator(page.locator('#postal-code:visible, input[name*="postCode"]:visible'));
        this.postalCodeCheckBtn = this.modal.locator(page.locator('.sdf-comp-postal-code-button button'));
        this.categoryMenu = this.modal.locator(page.locator('.sdf-comp-category-menu'));
        this.modelMenu = this.modal.locator(page.locator(`
            .sdf-comp-model-menu,
            [formcontrolname="modelFormControl"],
            .trade-up__wrapper:first-child mat-expansion-panel
        `));
        this.brandMenu = this.modal.locator(page.locator(`
            .sdf-comp-brand-menu,
            [formcontrolname="brandFormControl"],
            .trade-up__wrapper:last-child mat-expansion-panel
        `));
        this.deviceConditions = this.modal.locator(page.locator(`
            ul[class*="summary-accept-list"]:visible,
            .condition-radio
        `));
        this.termsAndConditions = this.modal.locator(page.locator(`
            .sdf-comp-tnc-panel [type="checkbox"]:visible,
            mat-checkbox input
        `));
        this.summary = this.modal.locator('.summary-product-card');
        this.nextBtn = this.modal.locator(page.locator(`
            [an-la^="trade-up:"][an-la$=":next"]:visible,
            [data-an-la^="trade-up:"][data-an-la$=":next"],
            [an-la*="apply trade up"],
            [data-an-la*="apply trade up"],
            [data-an-la$=":add to cart"],
            .modal__footer .view-more
        `)).filter({ visible: true });
    }

    category(option: string | number): Locator {
        if (typeof option === 'number') return this.categoryMenu.getByRole('option').nth(option - 1);
        return this.categoryMenu.getByRole('option', { name: option });
    }

    model(option: string | number): Locator {
        const root = this.modelMenu.or(this.page.locator('.cdk-overlay-pane:visible'));
        const options = root.getByRole('option').or(root.getByRole('listitem'));
        if (typeof option === 'number') return options.nth(option - 1);
        return options.filter({ hasText: option });
    }

    brand(option: string | number): Locator {
        const root = this.brandMenu.or(this.page.locator('.cdk-overlay-pane:visible'));
        const options = root.getByRole('option').or(root.getByRole('listitem'));
        if (typeof option === 'number') return options.nth(option - 1);
        return options.filter({ hasText: option });
    }

    button(name: string): Locator {
        return this.modal.getByRole('button', { name, exact: true });
    }

    async acceptTermsAndConditions() {
        for (const term of await this.termsAndConditions.all()) {
            await term.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => { });
            await term.check({ force: true });
        }
    }

    async process(data?: TradeUpData) {
        data = { ...this.page.context().profile.tradeUp, ...data };
        for (let tries = 1; tries <= 3; tries++) {
            try {
                await this.nextBtn.waitFor({ timeout: 10000 });
                if (await this.postalCodeInput.isVisible()) {
                    await this.postalCodeInput.fill(data.postalCode!);
                    if (await this.postalCodeCheckBtn.isVisible()) {
                        await this.postalCodeCheckBtn.evaluate((e: any) => e.click());
                    }
                    await this.modal.locator('.success').first().waitFor({ timeout: 10000 }).catch(() => { });
                }
                if (await this.categoryMenu.isVisible()) {
                    await this.categoryMenu.click();
                    await this.category(data.category || 1).click({ timeout: 15000 });
                }
                if (await this.modelMenu.isVisible()) {
                    await this.modelMenu.click();
                    await this.model(data.model || 1).click({ timeout: 15000 });
                    await this.page.waitForTimeout(1000);
                }
                if (await this.brandMenu.isVisible()) {
                    await this.brandMenu.click();
                    await this.brand(data.brand || 1).click({ timeout: 15000 });
                    await this.page.waitForTimeout(1000);
                }
                if (await this.serialNumberInput.isVisible()) {
                    await this.serialNumberInput.fill(data.serialNumber!);
                }
                for (const condition of await this.deviceConditions.all()) {
                    await condition.locator(':has(> input)').first().click({ timeout: 5000 });
                }
                await this.acceptTermsAndConditions();

                await expect(this.nextBtn).not.toHaveAttribute('disabled');
                const btn = await this.nextBtn.elementHandle({ timeout: 5000 });
                await btn!.click({ force: true });
                await btn!.waitForElementState('hidden', { timeout: 10000 }).catch((e) => {
                    if (e.message?.includes('not attached to the DOM')) return;
                    throw new Error('Unable to process to next step');
                });

                await this.page.waitForTimeout(2000);
                if (await this.modal.isHidden()) break;
                tries = 0;
            } catch (error) {
                if (tries == 3) throw error;
            }
        }
    }
}
