import assert from 'assert';
import type { Locator, ExpectMatcherState, MatcherReturnType } from 'playwright/test';
import { expect, Page } from 'fixtures';
import type { Product } from './product';

import API from './API';
import GNB from './GNB';
import Recommendation from './Recommendation';
import { CartRHS } from './RHS';
import TradeIn from './TradeIn';
import TradeUp from './TradeUp';
import SCP from './SCP';
import Warranty from './Warranty';

/**
 * Empty cart page
 */
class EmptyCart {
    readonly section: Locator;
    readonly icon: Locator;
    readonly headline: Locator;
    readonly subtitle: Locator;
    readonly continueShoppingBtn: Locator;
    readonly signInBtn: Locator;

    constructor(private page: Page) {
        this.section = this.page.locator('.cart-details__empty');
        this.icon = this.section.locator('[svgicon="cart"]');
        this.headline = this.section.getByRole('heading');
        this.subtitle = this.section.locator('h2 + p');
        this.continueShoppingBtn = this.section.locator('[data-an-la="empty cart:continue shopping"], [data-an-la="empty cart:back to previous"]') // ID: [data-an-la="empty cart:back to previous"]
        this.signInBtn = this.section.locator('[data-an-la="empty cart:sign in"]');
    }
}

export class AddedService {
    readonly icon: Locator;
    readonly name: Locator;
    readonly description: Locator;
    readonly learnMoreLink: Locator;
    readonly appliedMessage: Locator;
    readonly editBtn: Locator;
    readonly removeBtn: Locator;
    readonly errorMessage: Locator;
    readonly price: Locator;
    readonly priceText: Locator;
    readonly addtionalInfo: Locator;

    constructor(readonly section: Locator) {
        this.icon = this.section.locator('.service-item__icons img');
        this.name = this.section.locator('.service-item__name').first();
        this.description = this.section.locator('.service-item__description');
        this.learnMoreLink = this.section.locator('[data-an-la$=":learn more"]');
        this.appliedMessage = this.section.locator('.service-item__applied-message');
        this.editBtn = this.section.locator('.action-icon--edit, [data-mat-icon-name="icon-regular-action-edit"]');
        this.removeBtn = this.section.locator('.service-item__remove--btn, [data-an-tr="cart-product-remove"], [data-an-la="remove item"]');
        // ID renders an always-present empty error div next to the real one, so filter on visibility
        this.errorMessage = this.section.locator('.service-item__error:visible');
        this.priceText = this.section.locator('.trade-in__item-discount');
        this.price = this.section.locator('.action-text');
        this.addtionalInfo = this.section.locator('.service-item__additional-info');
    }

    /** Click remove, then confirm on the remove-service modal when it appears. */
    async remove() {
        const page = this.section.page();
        const yesBtn = page.locator('app-cart-item-remove-modal, app-remove-service-modal')
            .locator('[data-an-la="remove-item"], [data-an-la="delete option:yes"]');
        await this.removeBtn.click();
        if (await yesBtn.waitFor({ timeout: 5000 }).then(() => true).catch(() => false)) {
            await yesBtn.click();
        }
    }

    static async toBeAdded(this: ExpectMatcherState, service: AddedService, options = { timeout: 15000 }): Promise<MatcherReturnType> {
        try {
            await service.removeBtn.waitFor(options);
            await expect(service.removeBtn).toBeVisible(options);
            return { pass: true, message: () => 'Service is added to cart' };
        } catch (e) {
            return { pass: false, message: () => 'Service is not added to cart' };
        }
    }
}

export interface RemoveModal extends Locator {
    readonly closeBtn: Locator;
    readonly yesBtn: Locator;
    readonly noBtn: Locator;
    readonly title: Locator;
    readonly description: Locator;
}

export interface CancelConfirmModal extends Locator {
    readonly closeBtn: Locator;
    readonly yesBtn: Locator;
    readonly noBtn: Locator;
    readonly button: (name: string) => Locator;
}

export interface ConfirmCounterModal extends Locator {
    readonly closeBtn: Locator;
    readonly yesBtn: Locator;
    readonly noBtn: Locator;
}

/**
 * Cart item
 */
export class CartItem {
    readonly productName: Locator;
    readonly productImage: Locator;
    readonly productSku: Locator;
    readonly productColorAndStorage: Locator;
    readonly description: Locator;
    readonly merchText: Locator;
    readonly deliveryDate: Locator;
    readonly stockMessage: Locator;
    readonly promotionDescription: Locator;
    readonly vatLabel: Locator;

    readonly currentPrice: Locator;
    readonly actualPrice: Locator;
    readonly discountPrice: Locator;

    readonly removeBtn: Locator;
    readonly decreaseQuantityBtn: Locator;
    readonly quantityInput: Locator;
    readonly increaseQuantityBtn: Locator;

    readonly addTradeInBtn: Locator;
    readonly tradeIn: AddedService;

    readonly addTradeUpBtn: Locator;
    readonly tradeUp: AddedService;

    readonly addSCPBtn: Locator;
    readonly scp: AddedService;

    readonly addWarrantyBtn: Locator;
    readonly warranty: AddedService;

    readonly addGalaxyClubBtn: Locator;
    readonly galaxyClub: AddedService;

    readonly addSSFlexBtn: Locator;
    readonly ssFlex: AddedService;

    readonly addKnoxBtn: Locator;
    readonly knox: AddedService;

    readonly addDASubBtn: Locator;
    readonly daSub: AddedService;

    readonly addMCSBtn: Locator;
    readonly mcs: AddedService;

    readonly sim: AddedService;
    readonly broadband: AddedService;

    readonly addOn: AddedService;
    readonly addAddOnBtn: Locator;

    constructor(readonly section: Locator) {
        const page = this.section.page();
        this.productName = section.locator(page.locator('.cart-item__name, .cart-item__product-name'));
        this.productImage = section.locator(page.locator('.cart-item__thumb img'));
        this.productSku = section.locator(page.locator('.cart-item__sku'));
        this.productColorAndStorage = section.locator('.cart-item__options-container');
        this.description = section.locator(page.locator('.cart-item__desc'));
        this.merchText = section.locator('app-cart-item-merch-text .merch-text');
        this.deliveryDate = section.locator(page.locator('app-delivery-date'));
        this.stockMessage = section.locator(page.locator('.cart-item__stock'));
        this.promotionDescription = section.locator('.promotion-description:visible');
        this.vatLabel = section.locator(page.locator('.vat-label'));

        this.currentPrice = section.locator(page.locator('.price__current'));
        this.actualPrice = section.locator(page.locator('.price__actual'));
        this.discountPrice = section.locator(page.locator('.price__discount:visible, .price__save'));

        this.removeBtn = this.section.locator('.cart-item__remove--btn');
        this.decreaseQuantityBtn = section.getByRole('button', { name: '-', exact: true });
        this.quantityInput = section.getByRole('textbox', { name: 'Quantity' }).or(section.locator('input.input-qty'));
        this.increaseQuantityBtn = section.getByRole('button', { name: '+', exact: true });

        this.addTradeInBtn = this.section.locator('[data-an-la="add service:trade-in"]');
        this.tradeIn = new AddedService(section.locator(`
            app-service-item-tradein,
            .service-item__trade-in,
            .service-item:has([data-an-la*="trade-in"]),
            [data-modelcode="TRADE-IN"]
        `).first());

        this.addTradeUpBtn = this.section.locator('[data-an-la="add service:trade-up"], [data-an-la="add service:tradeinTV"i]');
        this.tradeUp = new AddedService(section.locator(`
            app-service-item-tradeup,
            .service-item__trade-up,
            .service-item__trade-in-tv,
            .service-item:has([data-an-la*="trade-up"], [data-an-la*="tradeinTV"i]),
            [data-modelcode="TRADE-UP"]
        `).first());

        this.addSCPBtn = this.section.locator('[data-an-la^="add service:samsung care"], [data-an-la="add service:SC"]').and(page.locator(':not([svgicon*="edit"i])'));
        this.scp = new AddedService(section.locator(`
            app-service-item-smc,
            .service-item__smc,
            .service-item:has([data-an-la*="samsung care"])
        `).first());

        this.addWarrantyBtn = this.section.locator('[data-an-la*="add service:warranty"], [data-an-la*="add service:EW"]');
        this.warranty = new AddedService(section.locator(`
            app-service-item-smc,
            .service-item__smc,
            [data-pvisubtype="warranty"]
        `).first());

        this.addGalaxyClubBtn = this.section.locator('[data-an-la="add service:samsung galaxy club"]');
        this.galaxyClub = new AddedService(section.locator(`
            app-service-item-galaxy-club,
            .service-item:has([title="Galaxy Club"i]),
            [data-modeldisplay="Galaxy Club"i],
            [data-pvisubtype="galaxy club"]
        `).first());

        this.addSSFlexBtn = this.section.locator('[data-an-la*="add service:upgrade"],[data-an-la="add service:samsung flex"]');
        this.ssFlex = new AddedService(section.locator(`
            app-service-item-smf,
            .service-item__smf,
            .service-item:has([data-an-la*="samsung flex"])
        `).first());

        this.addKnoxBtn = this.section.locator('[data-an-la*="add service:knox_manage"]');
        this.knox = new AddedService(section.locator('.service-item:has([data-an-la*="knox_manage"])'));

        this.addDASubBtn = this.section.locator('[data-an-la="add service:replenishment"]');
        this.daSub = new AddedService(section.locator('.service-item:has(.replenishment-header)'));

        this.addMCSBtn = this.section.locator('[data-an-la="add service:mcs"]');
        this.mcs = new AddedService(section.locator('.service-item[data-modelname*="MCS"i]'));

        this.sim = new AddedService(section.locator('[data-pvisubtype="tariff"], [data-pimsubtype="tariff"], [data-modelcode*="SIM"i]'));
        this.broadband = new AddedService(section.locator('.service-item:has([src*="broadband"]), [data-modeldisplay="Broadband"i]'));

        this.addOn = new AddedService(section.locator('.service-item__addon'));
        this.addAddOnBtn = this.section.locator('[data-an-la*="add service:add-on"]');
    }

    static async toHaveQuantity(this: ExpectMatcherState, cartItem: CartItem, quantity: number, options = { timeout: 5000 }): Promise<MatcherReturnType> {
        try {
            await expect(cartItem.quantityInput).toHaveValue(quantity.toString(), options);
            return { pass: true, message: () => `Cart item have quantity ${quantity} as expected` };
        } catch (e: any) {
            return {
                pass: false,
                message: () => this.utils.matcherHint('toHaveQuantity', 'CartItem', quantity) + '\n' +
                    'Expected: ' + this.utils.printExpected(quantity) + '\n' +
                    'Received: ' + this.utils.printReceived(e.matcherResult?.actual)
            };
        }
    }
}

/**
 * Voucher popup (Hybrid)
 */
export class VoucherPopup {
    readonly modalTitle: Locator;
    readonly title: Locator;
    readonly subTitle: Locator;
    readonly limitVoucherCodeMsg: Locator;
    readonly voucherCountsMessage: Locator;
    readonly voucherOpts: Locator;
    readonly applyBtn: Locator;
    readonly closeBtn: Locator;
    readonly backBtn: Locator;
    readonly emptyVoucher: Locator;

    constructor(readonly modal: Locator) {
        this.modalTitle = this.modal.locator('#modal-title');
        this.title = this.modal.locator('.title');
        this.subTitle = this.modal.locator('.sub-text-container');
        this.limitVoucherCodeMsg = this.modal.locator('.max-limit');
        this.voucherCountsMessage = this.modal.locator('.cart-item-total:visible');
        this.voucherOpts = this.modal.locator('.voucher-details-box');
        this.applyBtn = this.modal.locator('[data-an-la="promo code popup:apply code"]');
        this.closeBtn = this.modal.locator('[data-an-la="promo code popup:close"]');
        this.backBtn = this.modal.locator('[data-an-la^="promo code popup:back"]');
        this.emptyVoucher = this.modal.locator('.empty-voucher:visible');
    }

    voucherItem(option?: string | number) {
        let item;
        switch (typeof option) {
            case 'string':
                item = this.voucherOpts.filter({ hasText: option });
                break;

            case 'number':
                item = this.voucherOpts.nth(option - 1);
                break;

            default:
                item = this.voucherOpts.first();
                break;
        }
        return Object.assign(item, {
            code: item.locator('.content'),
            radio: item.getByRole('checkbox'),
            title: item.locator('.title')
        })
    }

    async selectVoucher(...codes: string[]) {
        if (!codes || codes.length === 0) {
            const radioBtn = this.voucherItem().radio;
            await radioBtn.click({ force: true });
            await expect(radioBtn, 'Voucher is not seleted').toBeChecked();
            console.log(`Selected first voucher option`);
            return;
        }
        for (const code of codes) {
            const voucherOption = this.voucherItem(code);
            await expect(voucherOption, `Voucher ${code} is not found or not visible after 30s`).toBeVisible({ timeout: 30000 });
            const radioBtn = voucherOption.radio;
            if (!(await radioBtn.isChecked())) {
                await radioBtn.click({ force: true });
            }
            console.log(`selected voucher ${code}`);
        }
    }

    async unSelectedVoucher(...codes: string[]) {
        if (!codes || codes.length === 0) {
            const radioBtn = this.voucherItem().code;
            if (await radioBtn.isChecked()) {
                await radioBtn.click({ force: true });
                await expect(radioBtn, 'Voucher is still selected').not.toBeChecked();
                console.log(`UnSelected first voucher option`);
            }
            return;
        }
        for (const code of codes) {
            const voucherOption = this.voucherItem(code);
            await expect(voucherOption, `Voucher ${code} is not found or not visible after 30s`).toBeVisible({ timeout: 30000 });
            const radioBtn = voucherOption.radio;
            if (await radioBtn.isChecked()) {
                await radioBtn.click({ force: true });
                await expect(radioBtn, `Voucher ${code} is still selected`).not.toBeChecked();
                console.log(`UnSelected voucher ${code}`);
            }
        }
    }
}

/**
 * Cart page (Hybrid)
 */
export default class Cart {
    protected api: API;

    readonly gnb: GNB;
    readonly empty: EmptyCart;
    readonly recommendation: Recommendation;
    readonly supportPaymentBanner: Locator;
    readonly supportPaymentList: Locator;
    readonly footer: Locator;
    readonly rhs: CartRHS;
    readonly tradeIn: TradeIn;
    readonly tradeUp: TradeUp;
    readonly scp: SCP;
    readonly warranty: Warranty;

    readonly main: Locator;
    readonly detailsSection: Locator;
    readonly orderSummary: Locator;
    readonly cartMgsBanner: Locator;
    readonly itemCount: Locator;
    readonly cartItemList: Locator;
    readonly cartItems: CartItem;

    readonly removeModal: RemoveModal;
    readonly cancelConfirmModal: CancelConfirmModal;
    readonly confirmCounterModal: ConfirmCounterModal;
    readonly voucherPopup: VoucherPopup;

    constructor(readonly page: Page) {
        this.api = new API(page);
        this.gnb = new GNB(page);
        this.empty = new EmptyCart(page);
        this.recommendation = new Recommendation(page.locator('main app-product-recommendation-v2:visible'));
        this.supportPaymentBanner = page.locator('app-payment-type');
        this.supportPaymentList = page.locator('app-payment-type').getByRole('listitem');
        this.footer = page.locator('footer');
        this.rhs = new CartRHS(page.locator('.TokoRightContent'));
        this.tradeIn = new TradeIn(page);
        this.tradeUp = new TradeUp(page);
        this.scp = new SCP(page);
        this.warranty = new Warranty(page);

        this.detailsSection = page.locator('cx-cart-details');
        this.orderSummary = page.locator('cx-order-summary-v2:visible');
        this.cartMgsBanner = page.locator('app-cart-message-banner .cart-alert__message');
        this.main = this.gnb.section.or(this.detailsSection).or(this.rhs.section);
        this.itemCount = page.locator('.item-count');
        this.cartItemList = page.locator('cx-cart-item-list-v2');
        this.cartItems = new CartItem(page.locator('cx-cart-item-v2'));

        const removeModal = page.locator('app-cart-item-remove-modal, app-remove-service-modal');
        this.removeModal = Object.assign(removeModal, {
            closeBtn: removeModal.locator('.modal__close'),
            yesBtn: removeModal.locator('[data-an-la="remove-item"], [data-an-la="delete option:yes"]'),
            noBtn: removeModal.locator('[data-an-la*=":no"]'),
            title: removeModal.locator('.modal__title'),
            description: removeModal.locator('.modal__body')
        });
        const cancelConfirmModal = page.locator('.cancel-confirmation-modal, app-cancel-confirmation-modal');
        this.cancelConfirmModal = Object.assign(cancelConfirmModal, {
            closeBtn: cancelConfirmModal.locator('.modal__close'),
            yesBtn: cancelConfirmModal.locator('[data-an-la*=":yes"]'),
            noBtn: cancelConfirmModal.locator('[data-an-la*=":no"]'),
            button: (name: string) => cancelConfirmModal.getByRole('button', { name })
        });
        const confirmCounterModal = page.locator('app-item-counter-modal');
        this.confirmCounterModal = Object.assign(confirmCounterModal, {
            closeBtn: confirmCounterModal.locator('.modal__close'),
            yesBtn: confirmCounterModal.locator('[data-an-la="Yes"]'),
            noBtn: confirmCounterModal.locator('[data-an-la="No"]')
        });
        this.voucherPopup = new VoucherPopup(page.locator('app-voucher-code-modal:visible'));
    }

    get url() {
        return this.page.context().cartURL;
    }

    /** Opens the cart page and waits for it to render. */
    async open() {
        await this.page.goto(this.url);
        await this.waitForLoad();
    }

    async getCartId(): Promise<string | null> {
        return this.page.evaluate((storeID) => {
            return window.sessionStorage.ref || window.localStorage[`spartacus⚿${storeID}⚿cart`];
        }, this.page.context().storeID);
    }

    /** Navigate to the cart page; already there, reload only when asked. */
    async goto(reloadIfAlreadyOnCart = true) {
        if (this.page.url().startsWith(this.url)) {
            if (reloadIfAlreadyOnCart) {
                await this.page.reload();
                await this.waitForLoad();
            }
            return;
        }
        await this.page.goto(this.url);
        await this.waitForLoad();
    }

    /**
     * Add an item to cart via API, then land on a refreshed cart page.
     * `item` accepts 'SKU', 'SKU:quantity' or 'SKU(childSKU)'.
     */
    async addViaAPI(item: string) {
        const [skuPart, count] = item.split(':').filter(Boolean);
        const [sku, childSKU] = skuPart.split(/[()\s]/).filter(Boolean);
        const quantity = count ? parseInt(count) : 1;
        await this.goto(false);
        if (childSKU) {
            await this.api.addMultiToCart(sku, childSKU, quantity);
        } else {
            await this.api.addToCart(sku, quantity);
        }
        await this.page.reload();
        await this.waitForLoad();
    }

    /** Click the + button on a cart line `count` times. */
    async increaseQuantity(item: string | number, count = 1) {
        const cartItem = this.cartItem(item);
        for (let i = 0; i < count; i++) {
            await cartItem.increaseQuantityBtn.click();
            await this.waitForLoad();
        }
    }

    /** Click the - button on a cart line `count` times. */
    async decreaseQuantity(item: string | number, count = 1) {
        const cartItem = this.cartItem(item);
        for (let i = 0; i < count; i++) {
            await cartItem.decreaseQuantityBtn.click();
            await this.waitForLoad();
        }
    }

    /** Remove a cart line, confirming on the remove modal when it appears. */
    async removeItem(item: string | number) {
        try {
            const cartItem = this.cartItem(item);
            await cartItem.removeBtn.click();
            // The modal animates in, so isVisible() right after the click can miss it
            if (await this.removeModal.yesBtn.waitFor({ timeout: 5000 }).then(() => true).catch(() => false)) {
                await this.removeModal.yesBtn.click();
            }
            await cartItem.section.waitFor({ state: 'detached' });
        } catch (cause) {
            throw new Error(`Unable to remove cart item (${item})`, { cause });
        }
    }

    /** Open the Trade-in modal from a cart line without running the flow. */
    async clickAddTradeIn(item?: string | number) {
        await this.cartItem(item).addTradeInBtn.click();
        await this.tradeIn.modal.waitFor();
    }

    /** Open the Trade-up modal from a cart line without running the flow. */
    async clickAddTradeUp(item?: string | number) {
        await this.cartItem(item).addTradeUpBtn.click();
        await this.tradeUp.modal.waitFor();
    }

    async addToCart(product: Product, services?: string[]) {
        try {
            await this.waitForLoad();
            if (!services?.includes('SIM') && !services?.includes('FlexUpgrade') && !services?.includes('Flex Upgrade')) {
                await this.api.addToCart(product.sku).catch(e => {
                    product.canBuy = false;
                    throw e;
                });
                await this.page.reload();
                await this.page.goto(this.page.context().cartURL);
                await this.waitForLoad();
            }

            if (services) {
                const cartInfo = await this.api.getCurrentCartInfo();
                let entryNumber = this.api.getCartEntryNumber(cartInfo, product.sku);

                for (const service of services) {
                    if (service === 'SIM') {
                        const plans = await this.api.getSIMPlans(product.sku);
                        if (!plans.length) {
                            throw new Error(`No SIM option available for ${product.sku}`);
                        }
                        await this.addSIMViaAPI(product.sku, entryNumber, plans[0]);
                        if (this.page.context().profile.serviceData.SIM?.newCart) {
                            entryNumber = 0;
                        }
                        continue;
                    }
                    if (service.startsWith('SIM:')) {
                        const id = service.slice(4);
                        const plans = await this.api.getSIMPlans(product.sku);
                        const plan = plans.find(p => p.id.toLowerCase() === id.toLowerCase());
                        if (!plan) {
                            throw new Error(`No SIM option with plan ${id} available for ${product.sku}`);
                        }
                        await this.addSIMViaAPI(product.sku, entryNumber, plan);
                        continue;
                    }
                    if (service === 'FlexUpgrade' || service === 'Flex Upgrade') {
                        await this.addFlexUpgradeAPI(product.sku, entryNumber);
                        continue;
                    }
                    if (service == 'SMC') {
                        const options = await this.api.getSMCServices(product.sku);
                        if (!options.length) {
                            throw new Error(`No SC+ avaiable for ${product.sku}`);
                        }
                        await this.addSMCViaAPI(entryNumber, options[0]);
                        continue;
                    }
                    if (service.startsWith('SMC:')) {
                        const code = service.slice(4);
                        await this.addSMCViaAPI(entryNumber, { code });
                        continue;
                    }
                }
                await this.page.reload();
                await this.page.goto(this.page.context().cartURL);
                await this.waitForLoad();
            }
            product.canBuy = true;
        } catch (error: any) {
            throw new Error(`Unable to add product ${product.sku} to cart: ${error.message}`);
        }
    }

    async addSIMViaAPI(sku: string, entryNumber: number, plan: Record<string, any>) {
        try {
            const data: any = {
                serviceType: "SIM_PLAN",
                planId: plan.id
            };
            if (this.page.context().profile.serviceData.SIM?.newCart) {
                return await this.api.addedOldServiceToCart([
                    {
                        "services": [data],
                        "productCode": sku,
                        "qty": 1
                    }
                ]);
            }
            if (plan.serviceProduct) {
                data.serviceCode = plan.serviceProduct;
            } else {
                data.serviceCode = await this.api.getSIMServiceCode(sku, plan.carrier);
            }
            await this.api.addServiceToCart(entryNumber, data);
            console.info(`SIM added success for ${sku} at cart item ${entryNumber + 1}`);
        } catch (cause) {
            throw new Error(`Unable to add SIM at cart item ${entryNumber + 1}`, { cause });
        }
    }

    async addFlexUpgradeAPI(sku: string, entryNumber: number) {
        try {
            const data = this.page.context().profile.serviceData.flexUpgrade;
            data[0].productCode = sku;
            await this.api.addedOldServiceToCart(data);
            console.info(`Flex Upgrade added success for ${sku} at cart item ${entryNumber + 1}`);
        } catch (cause) {
            throw new Error(`Unable to add Flex Upgrade at cart item ${entryNumber + 1}`, { cause });
        }
    }

    public async addSMCViaAPI(entryNumber: number, option: Record<string, any>) {
        try {
            const data = {
                serviceCode: option.code,
                additionalInfos: [{
                    key: 'paymentCycle',
                    value: option.subscriptionFrequency,
                }],
            };
            await this.api.addServiceToCart(entryNumber, data);
            console.log(`SC+ with code ${option.code} added to cart entry ${entryNumber}`);
        } catch (cause) {
            throw new Error(`Unable to add SC+ at cart item ${entryNumber + 1}`, { cause });
        }
    }

    cartItem(item?: string | number): CartItem {
        const items = this.page.locator('cx-cart-item-v2');
        if (typeof item === 'number') {
            return new CartItem(items.nth(item - 1));
        }
        const sku = this.page.locator(`[data-modelcode="${item}"]`);
        const name = this.page.locator(`.cart-item__name:has-text("${item}"), .cart-item__product-name:has-text("${item}")`);
        return new CartItem(items.filter({ has: sku.or(name) }));
    }

    async addTradeIn(item: string | number, data?: TradeInData) {
        const cartItem = this.cartItem(item);
        await cartItem.addTradeInBtn.click();
        await expect(this.tradeIn.modal).toBeVisible({ timeout: 10000 });
        await this.tradeIn.process(data);
        await expect(this.tradeIn.modal).toBeHidden();
        await expect(cartItem.tradeIn.removeBtn.first()).toBeVisible({ timeout: 30000 });
    }

    async addTradeUp(item: string | number, data?: TradeUpData) {
        const cartItem = this.cartItem(item);
        await cartItem.addTradeUpBtn.click();
        await expect(this.tradeUp.modal).toBeVisible({ timeout: 10000 });
        await this.page.waitForTimeout(2000);
        await this.tradeUp.process(data);
        await expect(this.tradeUp.modal).toBeHidden();
        await expect(cartItem.tradeUp.removeBtn).toBeVisible({ timeout: 30000 });
    }

    async addSCP(item: string | number, option: number | string | LocatorFilter = 1) {
        const cartItem = this.cartItem(item);
        await cartItem.addSCPBtn.click();
        await expect(this.scp.modal).toBeVisible({ timeout: 10000 });
        await this.scp.option(option).click();
        await this.page.waitForTimeout(1000);
        await this.scp.checkTermsAndConditions();
        await this.page.waitForTimeout(1000);
        await this.scp.confirmBtn.click();
        await expect(this.scp.modal).toBeHidden();
        await expect(cartItem.scp.removeBtn).toBeVisible({ timeout: 30000 });
    }

    async addWarranty(item: string | number, option?: number | string) {
        const cartItem = this.cartItem(item);
        await cartItem.addWarrantyBtn.click();
        await expect(this.warranty.modal).toBeVisible({ timeout: 10000 });
        await this.warranty.option(option).click();
        await this.page.waitForTimeout(1000);
        await this.warranty.checkTermsAndConditions();
        await this.page.waitForTimeout(1000);
        await this.warranty.confirmBtn.click();
        await expect(this.warranty.modal).toBeHidden();
        await expect(cartItem.warranty.removeBtn).toBeVisible({ timeout: 30000 });
    }

    async applyCoupon(coupon: string) {
        await this.rhs.couponCodeInput.fill(coupon);
        await this.page.waitForTimeout(1000);
        await this.rhs.applyCouponBtn.click();
        await this.page.waitForTimeout(1000);
        // SG leaves the spinner in the DOM after the voucher is taken, so waiting for it to hide
        // alone never returns there. The success message is the other end of the same apply.
        await Promise.race([
            this.rhs.applyCouponSpinner.waitFor({ state: 'hidden', timeout: 30000 }),
            this.rhs.applySuccessMessage.waitFor({ state: 'visible', timeout: 30000 }),
        ]).catch(() => { });
    }

    /**
     * Empties the cart and verifies it is empty.
     *
     * Deleting entry 0 once per entry is not enough: entry numbers are not renumbered on delete, and
     * `deleteCartEntry` only throws on 5xx, so a refused delete passes silently and the leftover
     * ends up in the next order. The numbers are re-read every pass and the loop runs until the
     * cart reports no entries.
     */
    async clearCart() {
        const first = await this.api.getCurrentCartInfo();
        if (!first.entries?.length) return;
        for (let tries = 1; ; tries++) {
            const cart = await this.api.getCurrentCartInfo();
            if (!cart.entries?.length) break;
            if (tries > 5) throw new Error(`Cart still holds ${cart.entries.length} entries after 5 clear attempts`);
            for (const entry of [...cart.entries].reverse()) {
                await this.api.deleteCartEntry(entry.entryNumber);
            }
        }
        await this.page.reload();
        await this.waitForLoad();
    }

    async continueToCheckout() {
        await this.rhs.totalAmount.waitFor();
        for (let tries = 1; tries <= 2; tries++) {
            try {
                const btn = await this.rhs.checkoutBtn.or(this.rhs.guestCheckoutBtn).last().elementHandle({ timeout: 5000 }).catch(() => null);
                assert(btn, 'Checkout button is not visible');
                assert(await btn.isEnabled(), 'Checkout button is not enabled');
                await btn.click().catch(() => { throw new Error('Checkout button is not clickable') });
                await this.page.waitForFunction(e => !document.contains(e), btn, { timeout: 30000 }).catch(() => {
                    throw new Error('Checkout button is not working');
                });
                break;
            } catch (error) {
                if (tries == 2) throw error;
                await this.page.waitForTimeout(5000);
            }
        }
        await this.page.waitForURL(/guestlogin\/checkout|checkout\/one/);
        if (this.page.url().includes('guestlogin/checkout')) {
            const email = this.page.context().checkoutEmail;
            await this.page.fill('input[type="email"]', email);
            await this.page.click('[data-an-la="guest"]');
            await this.page.waitForTimeout(3000);
        }
        if (await this.page.locator('app-user-account-modal').isVisible()) {
            await this.page.click('[data-an-la*="continue to guest checkout"], [data-an-la="guest:registration history popup:συνέχεια ως επισκέπτης"]');
        }
        await this.page.waitForURL(/checkout\/one/);
        await this.page.waitForLoadState();
    }

    async waitForLoad() {
        try {
            await this.cartItemList.or(this.empty.section).waitFor({ timeout: 60000 });
            if (await this.cartItemList.isVisible()) {
                await this.rhs.totalAmount.waitFor({ timeout: 10000 });
            }
        } catch (error) {
            console.error(error);
            throw new Error('Cart page is not loaded successfully');
        }
    }

    static async containSKU(this: ExpectMatcherState, cart: Cart, sku: string, options?: { timeout?: number }): Promise<MatcherReturnType> {
        try {
            await cart.cartItem(sku).section.waitFor({ timeout: options?.timeout ?? 15000 });
            return { pass: true, message: () => `SKU ${sku} is in cart` };
        } catch (e) {
            return { pass: false, message: () => `SKU ${sku} is not in cart` };
        }
    }
}
