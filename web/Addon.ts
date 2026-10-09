import { expect } from 'playwright/test';
import type { Locator, Page } from 'playwright';
import type { PriceBar } from './BC';

export interface ProductCard extends Locator {
    productName: Locator;
    productPrice: Locator;
    addBtn: Locator;
    getProductSKU(): Promise<string | null>;
}

/**
 * Add-on page (both BC and PD)
 */
export default class AddOn {
    readonly section: Locator;

    readonly categoryList: Locator;
    readonly categoryItems: Locator;
    readonly productCards: Locator;

    readonly addableProducts: ProductCard;
    readonly selectedProducts: ProductCard;

    readonly priceBar: PriceBar;
    readonly estimatedPriceBar: Locator;
    readonly selectedItems: Locator;
    readonly selectedItemPrice: Locator;

    readonly skipBtn: Locator;
    readonly continueBtn: Locator;

    constructor(readonly page: Page) {
        this.section = page.locator('.hubble-addon-page:visible, .pdd16-step-buying--default:visible, .pdd16-step-buying-v2:visible');

        this.categoryList = page.locator('.hubble-addon-page__category-list');
        this.categoryItems = page.locator('.hubble-addon-page__category-item');
        this.productCards = page.locator('.hubble-addon-page__item, .pdd16-step-buying__card, .pdd16-step-buying-v2__card');

        const addable = page.locator('[an-la$=":add item"]');
        const selected = page.locator('.is-selected');
        this.addableProducts = this.productCard(this.productCards.filter({ has: addable }));
        this.selectedProducts = this.productCard(this.productCards.and(selected));

        const priceBar = page.locator('.hubble-addon-page__top, .pdd16-step-buying__header-add-on-product');
        this.priceBar = Object.assign(priceBar, {
            addToCartBtn: priceBar.locator('[an-la$=":add item"]:visible'),
            preOrderBtn: priceBar.locator('[an-la*="pre order"]:visible'),
            stockAlertBtn: priceBar.locator('[an-la*="stock alert"]:visible'),
            monthlyPrice: priceBar.locator('.s-total-price .s-price').first(),
            fullPrice: priceBar.locator('.s-total-price .s-price').last(),
            currentPrice: priceBar.locator('.s-total-price .s-price').last(),
            wasPrice: priceBar.locator('.s-was-price s'),
            savePrice: priceBar.locator('.s-was-price em'),
        });

        this.estimatedPriceBar = page.locator('.hubble-addon-page__price.is-show');
        this.selectedItems = this.estimatedPriceBar.locator('.hubble-addon-page__selected.scrollbar .hubble-addon-page__selected-item');
        this.selectedItemPrice = this.selectedItems.locator('.hubble-addon-page__selected-item-price .s-price');

        this.skipBtn = page.locator(`
            [an-la='evoucher:no addition:skip'],
            [an-la='evoucher:below evoucher:back'],
            [an-la="evoucher:over evoucher:continue"]
        `);
        this.continueBtn = page.locator(`
            [an-la='add-on:continue'],
            [an-la='add-on:go to cart'],
            [an-la='evoucher:continue'],
            [an-la='evoucher:go to cart'],
            [id='nextBtn'],
            [id='primaryInfoGoCartAddOn']
        `);
    }

    private productCard(locator: Locator): ProductCard {
        const addBtn = locator.locator('[an-la$=":add item"]');
        return Object.assign(
            locator, {
            productName: locator.locator('.hubble-item-card__product'),
            productPrice: locator.locator('.hubble-item-card__price, .pdd16-step-buying__card-price .card-price'),
            addBtn,
            getProductSKU: () => addBtn.getAttribute('data-modelcode')
        });
    }

    category(codeOrIndex: string | number): Locator {
        if (typeof codeOrIndex === 'number') {
            return this.categoryItems.nth(codeOrIndex - 1);
        }
        return this.categoryItems.filter({ has: this.page.locator(`[data-categroy-code="${codeOrIndex}"]`) });
    }

    product(item: string | number | Locator): ProductCard {
        switch (typeof item) {
            case 'string':
                return this.productCard(this.productCards.filter({ has: this.page.getByText(item, { exact: true }) }).first());
            case 'number':
                return this.productCard(this.productCards.nth(item - 1));
            case 'object':
                return this.productCard(this.productCards.filter({ has: item }));
        }
    }

    /** First add-on card whose Add CTA is available. */
    async getFirstInStockProduct(): Promise<ProductCard> {
        for (let i = 0, count = await this.productCards.count(); i < count; i++) {
            const card = this.product(i + 1);
            if (await card.addBtn.isVisible()) return card;
        }
        throw new Error('No in stock add-on products found');
    }

    async addToCart(product: ProductCard) {
        await product.addBtn.click();
        await expect(product.addBtn, 'Unable to add the add-on product').toHaveClass(/cta--emphasis|cta--on|is-selected/);
    }

    /** Leave the add-on page for the cart, skipping or continuing as offered. */
    async continueToCart() {
        for (let tries = 1; tries <= 3; tries++) {
            try {
                if (this.page.url().includes('/cart')) break;
                if (await this.skipBtn.count()) await this.skipBtn.click();
                if (await this.continueBtn.count()) await this.continueBtn.click();
                await this.page.waitForTimeout(2000);
                tries = 0;
            } catch (error) {
                if (tries == 3) throw error;
                await this.page.waitForTimeout(tries * 2000);
            }
        }
    }
}
