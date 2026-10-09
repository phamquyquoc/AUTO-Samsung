import type { Locator } from 'playwright';
import { FormField } from './Form';
import { expect } from 'fixtures';
import { parsePrice } from './utils';

class OrderSummary {
    readonly productItem: Locator;

    readonly summary: Locator;
    readonly summaryHeading: Locator;
    readonly summaryRows: Locator;

    readonly totalSummary: Locator;
    readonly totalLabel: Locator;
    readonly totalAmount: Locator;

    readonly tieringMessage: Locator;
    readonly rewardsBenefit: Locator;
    readonly rewardsTooltip: Locator;

    constructor(readonly section: Locator) {
        this.productItem = section.locator('cx-cart-item-v2');

        this.summary = section.locator('.cx-summary-total');
        this.summaryHeading = this.summary.getByRole('heading');
        this.summaryRows = this.summary.locator(':has(> .cx-summary-amount):not(.cx-summary-first-item)');

        this.totalSummary = section.locator('.cx-summary-first-item');
        this.totalLabel = section.locator('.summary-total');
        this.totalAmount = section.locator('.summary-total__amount');

        this.tieringMessage = section.locator('.summary-tiering-message');
        this.rewardsBenefit = section.locator('.summary-rewards-benefit');
        this.rewardsTooltip = section.locator('.delivery-info-tooltip, .order-summary-reward-tooltip');
    }

    lineItemBySku(sku: string) {
        return new ProductItem(this.productItem.locator(`[data-modelcode="${sku}"]`));
    }

    summaryRow(label: string) {
        return this.summaryRows.filter({ hasText: label });
    }

    summaryRowAmount(label: string) {
        return this.summaryRow(label).locator('.cx-summary-amount');
    }

    async getEstimatedEarnedPoints() {
        await expect(this.rewardsBenefit).toBeVisible();
        const text = await this.rewardsBenefit.textContent();
        return Number(text!.match(/[\d\.\s]+/)![0].replaceAll(/\s/g, ''));
    }

    async getTotalAmount(locale: string) {
        const text = await this.totalAmount.textContent();
        return parsePrice(text!, locale);
    }
}

class ProductItem {
    readonly productImage: Locator;
    readonly productName: Locator;
    readonly productColorAndSize: Locator;
    readonly currentPrice: Locator;
    readonly actualPrice: Locator;
    readonly promotionDescription: Locator;

    constructor(readonly section: Locator) {
        this.productImage = section.locator('.cart-item__thumb');
        this.productName = section.locator('.cart-item__name-checkout');
        this.productColorAndSize = section.locator('.cart-item__options-container');
        this.currentPrice = section.locator('.price__current');
        this.actualPrice = section.locator('.price__actual');
        this.promotionDescription = section.locator('.promotion-description');
    }
}

class BaseRHS extends OrderSummary {
    readonly couponSection: Locator;
    readonly couponCodeInput: FormField;
    readonly applyCouponBtn: Locator;
    readonly applyCouponSpinner: Locator;
    readonly viewPromoCodeBtn: Locator;
    readonly applySuccessMessage: Locator;
    readonly applyErrorMessage: Locator;
    readonly voucherPromotionMessage: Locator
    readonly couponAppliedItem: Locator;
    readonly removeCouponBtn: Locator;
    readonly tradeInBonus: Locator;
    readonly tradeUpBonus: Locator;

    constructor(readonly section: Locator) {
        super(section);
        // Hybrid storefront keeps an SSR copy behind the client-rendered voucher component. Target
        // the visible one; otherwise `fill()` waits forever on the hidden duplicate.
        this.couponSection = section.locator('cx-cart-coupon-v2:visible');
        this.couponCodeInput = Object.assign(
            this.couponSection.getByRole('textbox'), {
            label: this.couponSection.locator('label'),
            errorMessage: this.couponSection.locator('mat-error:visible'),
            clearBtn: this.couponSection.locator('.clear-btn, .clear-button')
        }) as FormField;
        this.applyCouponBtn = this.couponSection.locator('[data-an-la="coupon:apply"], [data-an-la="promo code:apply"], [data-an-la="shop cart coupon:apply"], [data-an-la="shop checkout coupon:apply"]');
        this.applyCouponSpinner = this.couponSection.locator('mat-spinner');
        this.viewPromoCodeBtn = section.locator('.btn-view-promoCode:visible');
        this.applySuccessMessage = section.locator('.voucher-success:visible');
        this.applyErrorMessage = section.locator('.mat-mdc-form-field-error:visible');
        this.voucherPromotionMessage = section.locator('.voucher-promotion-message-container:visible');
        this.couponAppliedItem = section.locator('.voucher-applied-code:visible');
        this.removeCouponBtn = section.locator('[data-an-la="promo code:delete"]');
        this.tradeInBonus = section.locator('app-trade-in-bonus');
        this.tradeUpBonus = this.tradeInBonus;
    }

    text(text: string | RegExp): Locator {
        return this.section.getByText(text, { exact: true });
    }
}

/**
 * Cart Right Hand Side (RHS)
 */
export class CartRHS extends BaseRHS {
    readonly component: Locator;
    readonly checkoutBtn: Locator;
    readonly guestCheckoutBtn: Locator;
    readonly expressCheckoutBtn: Locator;

    readonly termsAndConditions: Locator;
    readonly reasonsToBuy: Locator;
    readonly promotionMessage: Locator;

    constructor(readonly section: Locator) {
        super(section);

        this.component = section.locator('cx-cart-totals-v2:visible');
        this.checkoutBtn = section.locator('[data-an-la="proceed to checkout"]:visible');
        this.guestCheckoutBtn = section.locator('[data-an-la^="proceed to checkout:"][data-an-la*="guest"]:visible');
        this.expressCheckoutBtn = this.checkoutBtn;

        this.termsAndConditions = section.locator('app-terms-conditions:visible');
        this.reasonsToBuy = section.locator('app-highlight-offers');
        this.promotionMessage = section.locator('.voucher-promotion-message-container:visible');
    }
}

/**
 * Splash Right Hand Side (RHS)
 */
export class SplashRHS extends OrderSummary {
    readonly editBtn: Locator;

    constructor(readonly section: Locator) {
        super(section);
        this.editBtn = section.locator('[data-an-la="order summary:edit"]:visible');
    }
}

/**
 * Checkout Right Hand Side (RHS)
 */
export class CheckoutRHS extends BaseRHS {
    readonly editBtn: Locator;
    readonly shareCartBtn: Locator;

    constructor(readonly section: Locator) {
        super(section);
        this.editBtn = section.locator('[data-an-la="order summary:edit"]:visible');
        this.shareCartBtn = section.locator('[data-an-la="share basket"]:visible');
    }

    cartItem(item?: string | number): CartItem {
        const items = this.section.locator('cx-cart-item-v2');
        if (typeof item === 'number') {
            return new CartItem(items.nth(item - 1));
        }
        const sku = this.section.locator(`[data-modelcode="${item}"]`);
        const name = this.section.locator(`.cart-item__name-checkout:has-text("${item}")`);
        return new CartItem(items.filter({ has: sku.or(name) }));
    }
}

/**
 * Payment Right Hand Side (RHS)
 */
export class PaymentRHS extends CheckoutRHS {
    constructor(readonly section: Locator) {
        super(section);
    }
}

class CartItem {
    readonly productImage: Locator;
    readonly productName: Locator;
    readonly productPrice: Locator;

    constructor(readonly section: Locator) {
        const page = this.section.page();
        this.productImage = section.locator(page.locator('.cart-item__thumb img'));
        this.productName = section.locator(page.locator('.cart-item__name-checkout'));
        this.productPrice = section.locator(page.locator('.price-container'));
    }
}
