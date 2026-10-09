import type { Locator } from 'playwright';
import { expect, Page } from 'fixtures';
import type { Product } from './product';
import { selectCountry } from './common';

import GNB from './GNB';
import TradeIn from './TradeIn';
import SCP from './SCP';
import Addon from './Addon';
import Gift from './Gift';

export interface ConfirmPopup extends Locator {
    readonly title: Locator;
    readonly message: Locator;
    button(name: string): Locator;
}

export interface WishlistPopup extends Locator {
    readonly keepBrowsingBtn: Locator;
    readonly addToWishlistBtn: Locator;
    readonly closeBtn: Locator;
}

/** Sticky price bar at the top of the BC page. */
export interface PriceBar extends Locator {
    readonly addToCartBtn: Locator;
    readonly preOrderBtn: Locator;
    readonly stockAlertBtn: Locator;
    readonly monthlyPrice: Locator;
    readonly fullPrice: Locator;
    readonly currentPrice: Locator;
    readonly wasPrice: Locator;
    readonly savePrice: Locator;
}

export interface Summary extends Locator {
    readonly currentPrice: Locator;
    readonly wasPrice: Locator;
    readonly savePrice: Locator;
    readonly productSKU: Locator;
    readonly productName: Locator;
    readonly productInfo: Locator;
    readonly addToCartBtn: Locator;
    readonly getStockAlertBtn: Locator;
}

/**
 * Buy Configuration page (AEM)
 */
export default class BC {
    readonly gnb: GNB;
    readonly tradeIn: TradeIn;
    readonly scp: SCP;
    readonly addOn: Addon;
    readonly gift: Gift;

    readonly addToCartBtn: Locator;
    readonly getStockAlertBtn: Locator;
    readonly priceBar: PriceBar;

    readonly sizingKitOpts: Locator;
    readonly actualRingOpts: Locator;
    readonly ringMaximumQttPopup: Locator;
    readonly ringCloseMaximumQttPopupBtn: Locator;

    readonly tradeInSection: Locator;
    readonly tradeInYesOpt: Locator;
    readonly tradeInNoOpt: Locator;
    readonly addOtherTradeInBtn: Locator;
    readonly removeTradeInBtn: Locator;
    readonly tradeInSummary: Locator;

    readonly leaseSection: Locator;
    readonly leaseOpt: Locator;

    readonly scpSection: Locator;
    readonly scpOpts: Locator;
    readonly scpNoneOpt: Locator;
    readonly scpPlans: Locator;

    readonly simSection: Locator;
    readonly simOpts: Locator;
    readonly addSimBtn: Locator;
    readonly removeSIMBtn: Locator;
    readonly editSIMBtn: Locator;

    readonly flexSection: Locator;
    readonly flexOpts: Locator;
    readonly addFlexBtn: Locator;

    readonly galaxyClubSection: Locator;
    readonly addGalaxyClubBtn: Locator;
    readonly galaxyClubNoOpt: Locator;

    readonly addWishlistIcon: Locator;
    readonly removeWishlistIcon: Locator;
    readonly wishlistPopup: WishlistPopup;

    readonly summarySKU: Locator;

    readonly confirmPopup: ConfirmPopup;

    readonly mboSection: Locator;
    readonly mboAddBtn: Locator;

    readonly summary: Summary;

    public product?: Product;

    constructor(readonly page: Page) {
        this.gnb = new GNB(page);
        this.tradeIn = new TradeIn(page);
        this.scp = new SCP(page);
        this.addOn = new Addon(page);
        this.gift = new Gift(page);

        this.addToCartBtn = page.getByRole('button').and(page.locator(`
            [an-la*='sticky bar:add to cart'],
            [an-la*='sticky bar:continue'],
            [an-la*='sticky bar:buy now'],
            [an-la*='sticky bar:pre order'],
            [an-la*='sticky bar:buy with subscription'],
            [an-la*='secondary:buy with subscription'],
            [an-la*='top sticky bar:checkout'],
            [an-la='anchor navi:add to cart']
        `));
        this.getStockAlertBtn = page.getByRole('button').and(page.locator('[an-la="top sticky bar:stock alert"]'));

        const priceBar = page.locator('.hubble-price-bar');
        this.priceBar = Object.assign(priceBar, {
            addToCartBtn: priceBar.locator('[an-la="top sticky bar:add to cart"]:visible'),
            preOrderBtn: priceBar.locator('[an-la="top sticky bar:pre order"]:visible'),
            stockAlertBtn: priceBar.locator('[an-la="top sticky bar:stock alert"]:visible'),
            monthlyPrice: priceBar.locator('.s-total-price .s-price').first(),
            fullPrice: priceBar.locator('.s-total-price .s-price').last(),
            currentPrice: priceBar.locator('.hubble-price-bar__price .s-hubble-highlight').last(),
            wasPrice: priceBar.locator('.hubble-price-bar__price .hubble-price-bar__price-total-save s'),
            savePrice: priceBar.locator('.hubble-price-bar__price .hubble-price-bar__price-total-save em'),
        });

        this.sizingKitOpts = page.locator('.s-option-box:has([data-ringtype="n"])');
        this.actualRingOpts = page.locator('.s-option-box:has([data-ringtype="y"])');
        this.ringMaximumQttPopup = page.locator('section.popup');
        this.ringCloseMaximumQttPopupBtn = this.ringMaximumQttPopup.locator('.bc-alert-close');

        this.tradeInSection = page.locator('#trade-in, .trade-in-option');
        this.tradeInYesOpt = this.tradeInSection.locator('[an-la="trade-in:yes"i]:visible');
        this.tradeInNoOpt = this.tradeInSection.locator('[an-la="trade-in:no"i]:visible');
        this.addOtherTradeInBtn = page.locator('[an-la="trade-in:add another trade-in"]:visible');
        this.removeTradeInBtn = page.locator('[an-la="trade-in:delete"]:visible');
        this.tradeInSummary = page.locator('.s-tradein-summary__price');

        this.leaseSection = page.locator('#lease');
        this.leaseOpt = page.locator(':has(> [an-la="choose between:uptoyou lease"i]):visible');

        this.scpSection = page.locator('#samsung-care, .option-care, .care-option');
        this.scpOpts = page.locator(`
            #samsung-care .js-smc,
            #offer_care .js-smc,
            .care-option [role="tab"]:not([an-la$=":no"])
        `);
        this.scpNoneOpt = this.scpSection.locator('.js-smc-none, [an-la="samsung care:no"i]');
        this.scpPlans = page.locator(`
            .hubble-product__options-payment:visible .s-option-box,
            .samsung-care-tabpanel__option-item:visible
        `);

        this.simSection = page.locator('#tariff, #offer_tariff, :has(> #tariffEsim):visible').first();
        this.simOpts = this.simSection.locator('.s-option-box:visible');
        this.addSimBtn = page.locator('[an-la="tariff:apply"]');
        this.removeSIMBtn = page.locator(`
            [an-la="tariff:remove"],
            [an-la^="tariff:"][an-la$="remove"]
        `);
        this.editSIMBtn = page.locator('[an-la="tariff:edit"]');

        this.flexSection = page.locator('#flex, #UPGRADE');
        this.flexOpts = page.locator('[an-la="purchase program:upgrade program"]');
        this.addFlexBtn = page.locator('[an-la*="upgrade program:apply"]:visible');

        this.galaxyClubSection = page.locator('#galaxy-club');
        this.addGalaxyClubBtn = page.locator('[an-la="samsung galaxy club:join now"], [an-la="samsung galaxy club:jetzt mitglied werden"]');
        this.galaxyClubNoOpt = page.locator(`.s-option-galaxy-club [id='gc-no-btn']`);

        this.addWishlistIcon = this.page.locator('[an-la="add to wishlist"]:visible');
        this.removeWishlistIcon = this.page.locator('[an-la="remove from wishlist"]:visible');

        const wishlistPopup = page.locator('.hubble-wish-added-popup, .hubble-wish-create-popup');
        this.wishlistPopup = Object.assign(wishlistPopup, {
            keepBrowsingBtn: wishlistPopup.locator('[an-la*="keep browsing"]'),
            addToWishlistBtn: wishlistPopup.locator('[an-la*="add to wishlist"], [an-la="popup:logged out:continue"]'),
            closeBtn: wishlistPopup.locator('.s-close')
        });

        this.summarySKU = page.locator('.hubble-product__summary .s-option-summary');

        this.confirmPopup = Object.assign(page.locator('.confirm-popup'), {
            title: page.locator('.confirm-popup__title'),
            message: page.locator('.confirm-popup__desc'),
            button: (name: string) => page.locator('.confirm-popup').getByRole('button', { name })
        });

        this.mboSection = page.locator('#offer_together');
        // MY labels the CTA "multi buy offer:add item", IN just "multi buy offer:add", and both
        // rewrite it to ":Added" once the product is picked.
        this.mboAddBtn = page.locator('[an-la^="multi buy offer:add" i]');

        const summarySection = page.locator('.hubble-product__summary');
        this.summary = Object.assign(summarySection, {
            currentPrice: summarySection.locator('.hubble-product__summary-product-price').first(),
            wasPrice: summarySection.locator('.hubble-product__summary-product-price .s-was-price s'),
            savePrice: summarySection.locator('.hubble-product__summary-product-price .s-was-price em'),
            productSKU: summarySection.locator('.s-option-summary'),
            productName: summarySection.locator('.hubble-product__summary-product-inner .s-option-title'),
            productInfo: summarySection.locator('.s-option-choice'),
            addToCartBtn: summarySection.locator('.hubble-product__total-cta:visible'),
            getStockAlertBtn: summarySection.locator('[an-la*="stock alert"]:visible'),
        });
    }

    async isTradeInOptionSelectable() {
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
        await expect(this.tradeIn.modal).toBeVisible({ timeout: 30000 });
        await this.tradeIn.process(data);
        await expect(this.tradeIn.modal).toBeHidden();
    }

    async addAnotherTradeIn(data?: TradeInData) {
        await this.addOtherTradeInBtn.click();
        await expect(this.tradeIn.modal).toBeVisible({ timeout: 30000 });
        await this.tradeIn.process(data);
        await expect(this.tradeIn.modal).toBeHidden();
    }

    async shouldSelectSCP() {
        if (await this.scpOpts.filter({ visible: true }).count() === 0) return false;
        if (await this.scpNoneOpt.evaluate(e => e.closest('[aria-disabled="true"], .js-smc-none.cta--disabled'))) return false;
        if (await this.scpOpts.evaluateAll(elms => elms.some(elm => elm.className.includes('checked')))) {
            if (await this.scpPlans.evaluateAll(elms => elms.length == 0 || elms.some(elm => elm.className.includes('checked')))) return false;
        }
        return true;
    }

    async addSCP(option: number | string = 1, plan: number | string | LocatorFilter = 1): Promise<[Locator, Locator | undefined]> {
        const optionLocator = typeof option === 'number' ? this.scpOpts.nth(option - 1) : this.scpOpts.locator(option);
        await optionLocator.click();
        await expect(optionLocator).toContainClass('is-checked');
        await expect(this.scpPlans.first().or(this.scp.modal)).toBeVisible();
        let planLocator = undefined;
        if (await this.scpPlans.first().isVisible()) {
            switch (typeof plan) {
                case 'number':
                    planLocator = this.scpPlans.nth(plan - 1);
                    break;
                case 'string':
                    planLocator = this.scpPlans.filter({ has: this.page.getByText(plan, { exact: true }) });
                    break;
                default:
                    planLocator = this.scpPlans.filter(plan).first();
            }
            await planLocator.click();
            await expect(planLocator).toContainClass('is-checked');
        }
        await expect(this.scp.modal).toBeVisible({ timeout: 30000 });
        await this.scp.checkTermsAndConditions();
        await this.scp.confirmBtn.click();
        await expect(this.scp.modal).toBeHidden();
        await expect(optionLocator).toContainClass('is-checked');
        if (planLocator) await expect(planLocator).toContainClass('is-checked');
        return [optionLocator, planLocator];
    }

    async continueToCart() {
        for (let tries = 1; tries <= 3; tries++) {
            try {
                if (this.page.url().includes('/cart')) break;

                if (await this.isTradeInOptionSelectable()) {
                    await this.tradeInNoOpt.click({ timeout: 5000 });
                    console.log('Trade In No option selected');
                }

                if (await this.galaxyClubNoOpt.isVisible() && await this.galaxyClubNoOpt.isEnabled()) {
                    await this.galaxyClubNoOpt.click({ timeout: 5000 });
                    console.log('Galaxy Club No option selected');
                }

                if (await this.shouldSelectSCP()) {
                    await this.scpNoneOpt.click({ timeout: 5000 });
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

                if (await this.addOn.continueBtn.isVisible()) {
                    await this.addOn.continueBtn.click({ timeout: 5000 });
                    console.log('Continue button clicked');
                }

                if (await this.gift.continueBtn.isVisible()) {
                    await this.gift.continueBtn.click({ timeout: 5000 });
                    console.log('Continue button clicked');
                }
                tries = 0;
            } catch (error) {
                if (tries == 3) throw error;
                await this.page.waitForTimeout(tries * 2000);
            }
        }
        await this.page.waitForSelector('cx-cart-item-list-v2', { timeout: 30000 });
        await selectCountry(this.page);
    }

    /** SKU shown in the BC summary panel. */
    async getProductSKU() {
        return (await this.summary.productSKU.first().innerText()).trim();
    }

    /** Storage / RAM / color parsed from the BC summary options. */
    async getInfoProduct(): Promise<{ storage: string; ram: string; color: string }> {
        const options = this.summary.productInfo.locator('.s-product-opiton');
        const texts: string[] = [];
        for (let i = 0, count = await options.count(); i < count; i++) {
            texts.push(await options.nth(i).innerText());
        }
        const [storageRam, color] = [texts[0], texts.at(-1)!];
        const [storage, ram] = storageRam.split('｜').map(t => t.trim());
        return { storage, ram, color: color.trim() };
    }

    async selectColor(color: string) {
        try {
            const colorOpt = this.page.locator(`
                .s-option-box:has([an-la*="color:${color}"]),
                .hubble-pd-radio:has([an-la*="color:${color}"])
            `);
            if (!await colorOpt.evaluate(e => e.classList.contains('is-checked'))) {
                await colorOpt.click();
                await expect.soft(colorOpt).toHaveClass(/is-checked/);
            }
        } catch (cause) {
            throw new Error(`Unable to select color ${color}`, { cause });
        }
    }

    /** Ring BC: pick the "I don't know my size" (sizing kit) placeholder option. */
    async selectSizingKitOptions() {
        try {
            if (await this.sizingKitOpts.evaluate(e => e.classList.contains('is-checked'))) return;
            await this.sizingKitOpts.click();
        } catch (cause) {
            throw new Error('Unable to select sizing kit option', { cause });
        }
    }

    /** Ring BC: pick the actual ring size option. */
    async selectActualRingOptions() {
        try {
            if (await this.actualRingOpts.evaluate(e => e.classList.contains('is-checked'))) return;
            await this.actualRingOpts.click();
        } catch (cause) {
            throw new Error('Unable to select actual ring option', { cause });
        }
    }

    async selectRingSize(option: string) {
        await this.page.locator(`.s-option-box:has([an-la*="size:${option}"]) .s-label-inner`).first().click();
    }

    /**
     * Same option handling as continueToCart(), but stops on the add-on page
     * instead of continuing through to the cart.
     */
    async continueToAddOn() {
        for (let tries = 1; tries <= 3; tries++) {
            try {
                if (this.page.url().includes('/cart')) throw new Error('No add-on is setup for this product');
                if (await this.addOn.section.isVisible()) return;

                if (await this.isTradeInOptionSelectable()) {
                    await this.tradeInNoOpt.click({ timeout: 5000 });
                }
                if (await this.galaxyClubNoOpt.isVisible() && await this.galaxyClubNoOpt.isEnabled()) {
                    await this.galaxyClubNoOpt.click({ timeout: 5000 });
                }
                if (await this.shouldSelectSCP()) {
                    await this.scpNoneOpt.click({ timeout: 5000 });
                }
                if (await this.addToCartBtn.isVisible()) {
                    const btn = await this.addToCartBtn.elementHandle({ timeout: 5000 });
                    await btn!.click({ timeout: 5000 });
                    await btn!.waitForElementState('hidden', { timeout: 30000 }).catch((e) => {
                        if (e.message?.includes('not attached to the DOM')) return;
                        throw new Error('Add to cart button is not working');
                    });
                    await this.page.waitForTimeout(5000);
                }
                tries = 0;
            } catch (error) {
                if (tries == 3) throw error;
                await this.page.waitForTimeout(tries * 2000);
            }
        }
    }

    async waitForLoad() {
        try {
            await this.addToCartBtn.or(this.getStockAlertBtn).waitFor({ timeout: 60000 });
        } catch (error) {
            throw new Error('BC page is not loaded successfully');
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
        if (await this.addToCartBtn.isDisabled()) {
            if (this.product) {
                this.product.canBuy = false;
                throw new Error(`"Add to Cart" button is not clickable for product ${this.product.sku}`);
            }
            throw new Error('"Add to Cart" button is not clickable');
        }
    }

    async waitForStockAlertButton() {
        await this.waitForLoad();
        if (await this.getStockAlertBtn.isHidden()) {
            if (this.product) {
                this.product.outOfStock = false;
                throw new Error(`Get Stock Alert button is not show for product ${this.product.sku}`);
            }
            throw new Error('Get Stock Alert button is not show');
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

    async waitForLeaseSection() {
        await this.waitForSection('Lease', this.leaseSection, 'lease');
    }

    async waitForSCPSection() {
        await this.waitForSection('SC+', this.scpSection, 'scp');
    }

    async waitForSimSection() {
        await this.waitForSection('SIM', this.simSection, 'sim');
    }

    async waitForFlexSection() {
        await this.waitForSection('Flex', this.flexSection, 'flex');
    }

    async waitForGalaxyClubSection() {
        await this.waitForSection('Galaxy Club', this.galaxyClubSection, 'galaxyClub');
    }
}
