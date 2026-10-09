import { Locator } from 'playwright';
import { expect, Page } from 'fixtures';
import type { Product } from './product';
import { selectCountry } from './common';

import GNB from './GNB';
import TradeIn from './TradeIn';
import TradeUp from './TradeUp';
import SCP from './SCP';
import Warranty from './Warranty';
import Addon from './Addon';
import Gift from './Gift';

export interface WishlistPopup extends Locator {
    readonly keepBrowsingBtn: Locator;
    readonly addToWishlistBtn: Locator;
    readonly continueToShoppingBtn: Locator;
}

export interface Summary extends Locator {
    readonly currentPrice: Locator;
    readonly wasPrice: Locator;
    readonly savePrice: Locator;
}


/**
 * Product Detail page (AEM)
 */
export default class PD {
    readonly gnb: GNB;
    readonly tradeIn: TradeIn;
    readonly tradeUp: TradeUp;
    readonly scp: SCP;
    readonly warranty: Warranty;
    readonly addOn: Addon;
    readonly gift: Gift;

    readonly addToCartBtn: Locator;
    readonly getStockAlertBtn: Locator;
    readonly noLongerAvaiable: Locator;

    readonly tradeInSection: Locator;
    readonly tradeInYesOpt: Locator;
    readonly tradeInNoOpt: Locator;

    readonly tradeUpSection: Locator;
    readonly tradeUpYesOpt: Locator;
    readonly tradeUpNoOpt: Locator;
    /** Option result block — .result-trade-in markup is shared by trade-in and trade-up. */
    readonly tradeInSummary: Locator;
    readonly tradeUpPrice: Locator;

    readonly scpSection: Locator;
    readonly scpNoneOpt: Locator;
    readonly scpOpts: Locator;
    readonly scpPaymentOpts: Locator;
    readonly selectedScpOption: Locator;

    readonly warrantySection: Locator;
    readonly warrantyYesOpt;
    readonly warrantyNoOpt: Locator;
    readonly warrantySummary: Locator;

    readonly productSKU: Locator;

    readonly addWishlistIcon: Locator;
    readonly removeWishlistIcon: Locator;
    readonly wishlistPopup: WishlistPopup;

    readonly summary: Summary;

    public product?: Product;

    constructor(readonly page: Page) {
        this.gnb = new GNB(page);
        this.tradeIn = new TradeIn(page);
        this.tradeUp = new TradeUp(page);
        this.scp = new SCP(page);
        this.warranty = new Warranty(page);
        this.addOn = new Addon(page);
        this.gift = new Gift(page);

        this.addToCartBtn = page.locator(`
            [an-la="secondary nav:add to cart"i],
            [an-la="secondary navi:add to cart"i],
            [an-la="secondary nav:pre order"],
            [an-la="anchor navi:add to cart"],
            [an-la="anchor navi:pre-order"],
            [an-la="anchor navi:buy now"]
        `).filter({ visible: true }).last();
        this.getStockAlertBtn = page.locator('[an-la="stock alert"]:visible, [an-la="anchor navi:notify me"]:visible');
        this.noLongerAvaiable = page.locator('[aria-label="No longer available"]:visible');

        this.tradeInSection = page.locator('#trade-in');
        this.tradeInYesOpt = this.tradeInSection.locator('.pd-option-selector:has([an-la="trade-in:yes"i]):visible');
        this.tradeInNoOpt = this.tradeInSection.locator('.pd-option-selector:has([an-la="trade-in:no"i]):visible');
        this.tradeInSummary = page.locator('.result-trade-in');

        this.tradeUpSection = page.locator('#trade-up, #trade-in');
        this.tradeUpYesOpt = this.tradeUpSection.locator('[an-la="trade-up:yes"i] ~label');
        this.tradeUpNoOpt = this.tradeUpSection.locator('[an-la="trade-up:no"i] ~label');
        this.tradeUpPrice = this.tradeInSummary.locator('.option-result__text');

        this.scpSection = page.locator('.option-care');
        this.scpNoneOpt = this.scpSection.locator('.pd-select-option__item:has([an-la*="samsung care:no"])');
        this.scpOpts = this.scpSection.locator('li > :has(> [an-la*="samsung care:yes"])');
        this.scpPaymentOpts = this.scpSection.locator('.pd-select-option__payment:not(.hidden) :has(> input)');
        this.selectedScpOption = this.scpSection.locator('.pd-select-option__item.selected:not(:has([an-la="samsung care:no"]))');

        this.warrantySection = page.locator('.option-warranty-vd');
        this.warrantyYesOpt = this.warrantySection.locator('.pd-select-option__item:has([an-la="extended warranty:yes"])');
        this.warrantyNoOpt = this.warrantySection.locator('.pd-select-option__item:has([an-la="extended warranty:no"])');
        this.warrantySummary = page.locator('.option-result--extended-warranty-option:visible');

        this.productSKU = page.locator('.pdd39-anchor-nav__info-sku, .pd-info__sku-code, app-product-summary .product-code');

        this.addWishlistIcon = this.page.locator('[an-la="add to wishlist"]:visible');
        this.removeWishlistIcon = this.page.locator('[an-la="remove from wishlist"]:visible');

        const wishlistPopup = page.locator('.wishlist-popup .layer-popup__inner:visible');
        this.wishlistPopup = Object.assign(wishlistPopup, {
            keepBrowsingBtn: wishlistPopup.locator('[an-la*="keep browsing"]'),
            addToWishlistBtn: wishlistPopup.locator('[an-la="popup:logged in:add to wishlist"], [an-la="popup:logged out:continue"]'),
            continueToShoppingBtn: wishlistPopup.locator('[an-la="popup:logged in:continue shopping"]')
        });

        const summarySection = page.locator('.sg-pdh-order-summary');
        this.summary = Object.assign(summarySection, {
            currentPrice: summarySection.locator('.cost-box__price-now'),
            wasPrice: summarySection.locator('.cost-box__price-original'),
            savePrice: summarySection.locator('.cost-box__price-save')
        });
    }

    async isTradeInOptionSelectable(): Promise<boolean> {
        if (!await this.tradeInNoOpt.isVisible()) return false;
        const disabled = await this.tradeInNoOpt.evaluate(e =>
            e.className.includes('disabled') ||
            e.ariaDisabled === 'true' ||
            window.getComputedStyle(e).pointerEvents === 'none'
        );
        return !disabled;
    }

    async addTradeIn(data?: TradeInData) {
        await this.tradeInYesOpt.click();
        await expect(this.tradeIn.modal).toBeVisible({ timeout: 10000 });
        await this.tradeIn.process(data);
        await expect(this.tradeIn.modal).toBeHidden();
    }

    async isTradeUpOptionSelectable(): Promise<boolean> {
        if (!await this.tradeUpYesOpt.isVisible()) return false;
        const disabled = await this.tradeUpYesOpt.evaluate(e =>
            e.className.includes('disabled') ||
            e.ariaDisabled === 'true' ||
            window.getComputedStyle(e).pointerEvents === 'none'
        );
        return !disabled;
    }

    async addTradeUp() {
        await this.tradeUpYesOpt.click();
        await expect(this.tradeUp.modal).toBeVisible({ timeout: 10000 });
        await this.tradeUp.process();
        await expect(this.tradeUp.modal).toBeHidden();
    }

    async shouldSelectSCP() {
        const opts = this.scpOpts.filter({ visible: true });
        if (await opts.count() === 0) return false;
        if (await this.scpNoneOpt.evaluate(e => e.querySelector('[aria-disabled="true"], .js-smc-none.cta--disabled'))) return false;
        for (const opt of await opts.all()) {
            if (await opt.evaluate(e => e.querySelector('input:checked'))) {
                if (await this.scpPaymentOpts.count() === 0) return false;
                for (const paymentOpt of await this.scpPaymentOpts.all()) {
                    if (await paymentOpt.evaluate(e => e.querySelector('input:checked'))) return false;
                }
                return true;
            }
        }
        return true;
    }

    async addSCP(option: number | string = 1, paymentPlan: number | string | LocatorFilter = 1): Promise<[Locator, Locator | undefined]> {
        const optionLocator = typeof option === 'number' ? this.scpOpts.nth(option - 1) : this.scpOpts.locator(option);
        await optionLocator.click();
        await this.page.waitForTimeout(2000);
        let paymentLocator: Locator | undefined;
        if (await this.scpPaymentOpts.first().isVisible()) {
            switch (typeof paymentPlan) {
                case 'number':
                    paymentLocator = this.scpPaymentOpts.nth(paymentPlan - 1);
                    break;
                case 'string':
                    paymentLocator = this.scpPaymentOpts.filter({ hasText: paymentPlan });
                    break;
                default:
                    paymentLocator = this.scpPaymentOpts.filter(paymentPlan).first();
            }
            await paymentLocator.click();
        }
        await expect(this.scp.modal).toBeVisible();
        await this.scp.termsAndConditions.filter().waitFor({ timeout: 3000 }).catch(() => { });
        await this.scp.checkTermsAndConditions();
        await this.scp.confirmBtn.click();
        await expect(this.scp.modal).toBeHidden();
        await expect(optionLocator.locator('> input')).toBeChecked();
        if (paymentLocator) await expect(paymentLocator.locator('input')).toBeChecked();
        return [optionLocator, paymentLocator];
    }

    async addWarranty(option: number | string = 1) {
        await this.warrantyYesOpt.click();
        await expect(this.warranty.modal).toBeVisible({ timeout: 10000 });
        await this.warranty.option(option).click();
        await this.page.waitForTimeout(1000);
        await this.warranty.checkTermsAndConditions();
        await this.page.waitForTimeout(1000);
        await this.warranty.confirmBtn.click();
        await expect(this.warranty.modal).toBeHidden();
    }

    async continueToCart() {
        for (let tries = 1; tries <= 2; tries++) {
            try {
                if (this.page.url().includes('/cart')) break;

                if (await this.shouldSelectSCP()) {
                    await this.scpNoneOpt.click();
                    console.log('SCP None option selected');
                }

                if (await this.addToCartBtn.isVisible()) {
                    const btn = await this.addToCartBtn.elementHandle({ timeout: 5000 });
                    await btn!.click({ timeout: 5000 });
                    console.log('Add to cart button clicked');
                    await btn!.waitForElementState('hidden', { timeout: 30000 }).catch((e) => {
                        if (e.message?.includes('not attached to the DOM')) return;
                        throw new Error('Add to cart button is not working');
                    });
                    await this.page.waitForTimeout(5000);
                }

                if (await this.addOn.skipBtn.isVisible()) {
                    await this.addOn.skipBtn.click({ timeout: 5000 });
                    console.log('Skip button clicked');
                }

                if (await this.gift.continueBtn.isVisible()) {
                    await this.gift.continueBtn.click({ timeout: 5000 });
                    console.log('Gift continue button clicked');
                }

                if (await this.addOn.continueBtn.isVisible()) {
                    await this.addOn.continueBtn.click({ timeout: 5000 });
                    console.log('Continue button clicked');
                }

                if (await this.gift.continueBtn.isVisible()) {
                    await this.gift.continueBtn.click({ timeout: 5000 });
                    console.log('Gift continue button clicked');
                }
            } catch (error) {
                if (tries == 2) throw error;
                await this.page.waitForTimeout(tries * 2000);
            }
        }
        await this.page.waitForSelector('cx-cart-item-list-v2');
        await selectCountry(this.page);
    }

    async waitForLoad() {
        try {
            await this.addToCartBtn.or(this.getStockAlertBtn).or(this.noLongerAvaiable).waitFor({ timeout: 60000 });
        } catch (error) {
            throw new Error('PD page is not loaded successfully');
        }
    }

    async waitForAddToCartButton() {
        await this.waitForLoad();
        if (await this.getStockAlertBtn.isVisible()) {
            if (this.product) {
                this.product.canBuy = false;
                throw new Error(`Product ${this.product.sku} is out of stock`);
            }
            throw new Error('Product is out of stock');
        }
        if (await this.noLongerAvaiable.isVisible()) {
            if (this.product) {
                this.product.canBuy = false;
                this.product.noLongerAvaiable = true;
                throw new Error(`Product ${this.product.sku} is no longer available`);
            }
            throw new Error('Product is no longer available');
        }
        if (await this.addToCartBtn.isDisabled()) {
            if (this.product) {
                this.product.canBuy = false;
                throw new Error(`"Add to Cart" button is not clickable for product ${this.product.sku}`);
            }
            throw new Error('"Add to Cart" button is not clickable');
        }
    }

    async waitForSection(name: string, locator: Locator, setup: string) {
        try {
            await locator.waitFor({ timeout: 30000 });
        } catch (error) {
            if (this.product) {
                Object.assign(this.product, { [setup]: false });
                throw new Error(`${name} section is not displayed for product ${this.product.sku}`);
            }
            throw new Error(`${name} section is not displayed`);
        }
    }

    async waitForTradeInSection() {
        await this.waitForSection('Trade In', this.tradeInSection, 'tradeIn');
    }

    async waitForTradeUpSection() {
        await this.waitForSection('Trade Up', this.tradeUpSection, 'tradeUp');
    }

    async waitForSCPSection() {
        await this.waitForSection('SC+', this.scpSection, 'scp');
    }

    async waitForWarrantySection() {
        await this.waitForSection('Warranty', this.warrantySection, 'warranty');
    }

    /** SKU shown on the PD page. */
    async getProductSKU() {
        try {
            await this.productSKU.waitFor();
            return (await this.productSKU.innerText()).trim();
        } catch (cause) {
            throw new Error('Unable to read product SKU on PD page', { cause });
        }
    }
}
