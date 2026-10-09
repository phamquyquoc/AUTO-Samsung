import { Locator } from 'playwright';
import type { Page } from 'fixtures';
import Form, { FormField } from 'Form';
import GNB from 'GNB';

class SearchSection extends Form {
    readonly orderInput: FormField;
    readonly emailInput: FormField;
    readonly otpInput: FormField;
    readonly sendCodeBtn: Locator;
    readonly searchBtn: Locator;
    readonly otpHintText: Locator;
    /** Page-level lookup error, shown above the form. */
    readonly errorMessageTopPage: Locator;

    constructor(form: Locator) {
        super(form);
        this.errorMessageTopPage = this.page.locator('.order-guest-lookup-error');
        this.orderInput = this.field('orderId', 'orderSearchInput');
        this.emailInput = this.field('emailId');
        this.otpInput = this.field('verificationCode');
        this.sendCodeBtn = form.locator('.pill-btn.pill-btn--white');
        this.searchBtn = form.locator('[data-an-la="order look up:search"], .pill-btn.pill-btn--black');
        this.otpHintText = form.locator('mat-hint.otp-message');
    }
}

class Pagination {
    readonly pageList: Locator;
    readonly pageOf: Locator;
    readonly goToPageSelect: Locator;
    readonly nextPage: Locator;
    readonly previousPage: Locator;

    constructor(readonly section: Locator) {
        this.pageList = section.locator('#pagination-pagelist');
        this.pageOf = section.locator('#pagination-pageof');
        this.goToPageSelect = section.locator('mat-select#gotopage-select');
        this.nextPage = section.locator('[aria-label="next page"]');
        this.previousPage = section.locator('[aria-label="previous page"]');
    }
}

export default class MyOrders {
    readonly gnb: GNB;

    readonly search: SearchSection;
    readonly emptySection: Locator;
    readonly orderHistory: Locator;
    readonly resultCount: Locator;
    readonly orderItems: Locator;
    readonly tradeInOrderItems: Locator;
    readonly pagination: Pagination;

    constructor(readonly page: Page) {
        this.gnb = new GNB(page);

        this.search = new SearchSection(page.locator('.orders-search, app-order-guest-lookup, app-order-guest-lookup-tr'));
        this.emptySection = page.locator('.empty-page');
        this.orderHistory = page.locator('app-order-history');
        this.resultCount = page.locator('.order-history__result-count');
        this.orderItems = page.locator('app-order-item > .order-item, app-order-item-guest > .order-item, app-order-item-guest-tr > .order-item');
        this.tradeInOrderItems = page.locator('.order-item:has(app-trade-in-item)');
        this.pagination = new Pagination(page.locator('.pagination-container'));
    }

    get url() {
        return this.page.context().myOrdersURL;
    }

    orderItem(item?: string | number) {
        switch (typeof item) {
            case 'string':
                return new OrderItem(this.orderItems.filter({
                    has: this.page.locator(`.order-item__id:has-text("${item}")`)
                }));
            case 'number':
                return new OrderItem(this.orderItems.nth(item - 1));
            default:
                return new OrderItem(this.orderItems);
        }
    }

    tradeInOrderItem(item?: string | number) {
        switch (typeof item) {
            case 'string':
                return new OrderItem(this.tradeInOrderItems.filter({
                    has: this.page.locator(`.trade-in-item__id:has-text("${item}")`)
                }));
            case 'number':
                return new OrderItem(this.tradeInOrderItems.nth(item - 1));
            default:
                return new OrderItem(this.tradeInOrderItems);
        }
    }
}

interface OrderEntry extends Locator {
    readonly productName: Locator;
    readonly productImage: Locator;
    readonly summary: Locator;
    readonly tracker: Locator;
}

class OrderItem {
    readonly topRow: Locator;
    readonly orderID: Locator;
    readonly orderDate: Locator;
    readonly itemsCount: Locator;
    readonly estimatedPoints: Locator;
    readonly orderStatus: Locator;
    readonly orderEntries: OrderEntry;
    readonly details: Locator;
    readonly detailsAccount: Locator;
    readonly detailsSummary: Locator;
    readonly viewDetailsBtn: Locator;
    readonly showLessBtn: Locator;

    private orderEntry(locator: Locator) {
        return Object.assign(locator, {
            productName: locator.locator('.order-item-entry__name'),
            productImage: locator.locator('.order-item-entry__img'),
            summary: locator.locator('.order-item-entry-summary'),
            tracker: locator.locator('.order-item-entry-tracker'),
        });
    }

    constructor(readonly section: Locator) {
        this.topRow = section.locator('.order-item__top-row');
        this.orderID = section.locator('.order-item__id, .trade-in-item__id');
        this.orderDate = section.locator('.order-item__date, .trade-in-item__date');
        this.itemsCount = section.locator('.order-item__count');
        this.estimatedPoints = section.locator('.order-item__estimatedpoints');
        this.orderStatus = section.locator('.order-item-entry__order-status-text, .trade-in-item-entry__order-status-text');
        const orderEntries = section.locator('.order-item-entry:visible');
        this.orderEntries = this.orderEntry(orderEntries);
        this.details = section.locator('app-order-item-details, app-order-item-details-tr');
        this.detailsAccount = section.locator('.order-item-details-account');
        this.detailsSummary = section.locator('.order-item-details-summary');
        this.viewDetailsBtn = section.locator('[class*="view-detail-button"]:has([data-mat-icon-name*="arrow-down"])');
        this.showLessBtn = section.locator('[class*="view-detail-button"]:has([data-mat-icon-name*="arrow-up"])');
    }

    entry(item: string | number): OrderEntry {
        if (typeof item === 'string') {
            const sku = this.section.page().locator(`[data-modelcode="${item}"]`);
            const entry = this.section.locator(`.order-item-entry[data-modelcode="${item}"]`)
                .or(this.section.locator('.order-item-entry').filter({ has: sku }));
            return this.orderEntry(entry.first());
        }
        return this.orderEntry(this.orderEntries.nth(item - 1));
    }
}
