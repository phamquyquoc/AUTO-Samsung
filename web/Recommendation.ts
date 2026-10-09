import type { Locator } from 'playwright';

/**
 * Recommendation section (Hybrid)
 */
export default class Recommendation {
    readonly productCards: Locator;
    readonly nextBtn: Locator;
    readonly previousBtn: Locator;

    constructor(readonly section: Locator) {
        this.productCards = this.section.locator('app-product-v2');
        this.nextBtn = this.section.locator('.carousel-control-next-icon');
        this.previousBtn = this.section.locator('.carousel-control-prev-icon');
    }
}
