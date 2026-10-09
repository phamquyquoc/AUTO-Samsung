import { Locator } from 'playwright';
import { Page } from 'fixtures';

import GNB from './GNB';

export interface ProductCard extends Locator {
    productImage: Locator;
    productName: Locator;
    colors: Locator;
    options: Locator;
    addToCartBtn: Locator;
    buyNowBtn: Locator;
    stockAlertBtn: Locator;
    addToWishlistBtn: Locator;
    currentPrice: Locator;
}

/**
 * Product Finder page (AEM)
 */
export default class PF {
    readonly gnb: GNB;

    readonly productCards: Locator;
    readonly viewMoreBtn: Locator;

    constructor(readonly page: Page) {
        this.gnb = new GNB(page);

        this.productCards = page.locator('.js-pfv2-product-card, .js-pf-product-card');
        this.viewMoreBtn = page.locator('[an-la="view more"]:visible');
    }

    static productCard(card: Locator): ProductCard {
        return Object.assign(
            card, {
            productImage: card.locator('[an-la="image click"]'),
            productName: card.locator('[an-la="display name click"]'),
            colors: card.locator('[an-la*="color"]'),
            options: card.locator('[an-la*="mobile memory"], [an-la*="tv size"], [an-la^="refrigerators capacity"]'),
            addToCartBtn: card.locator('[an-la*="pf product card:buy"]'),
            buyNowBtn: card.locator('[an-la*="pf product card:buy"], [an-la*="pf product card:add to cart"], [an-la="pf product card:pre order"], [an-la="pf product card:notify me"]'),
            stockAlertBtn: card.locator('[an-la="stock alert"], [an-la="pf product card:notify me"]'),
            addToWishlistBtn: card.locator('[an-la="add to wishlist"]'),
            currentPrice: card.locator('.price-ux__price-current strong')
        });
    }

    firstProductCard(filter: LocatorFilter): ProductCard {
        return PF.productCard(this.productCards.filter(filter).first());
    }
}
