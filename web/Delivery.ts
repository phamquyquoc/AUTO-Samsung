import { type Locator } from 'playwright';
import { type Page, expect } from 'fixtures';
import Form from 'Form';

export type ItemLocator = string | number;

/**
 * Delivery page (Hybrid)
 */
export default class Delivery {
    readonly deliveryTypes: Locator;
    readonly consignments: Locator;

    readonly pickupForm: PickUpForm;
    readonly storesList: Locator;
    readonly storeItems: Locator;
    readonly deliveryPaginatorNext: Locator;
    readonly deliveryPaginatorBack: Locator;
    readonly storeServicesList: Locator;
    readonly storeServiceItem: Locator;

    readonly calendar: Calendar;

    constructor(readonly page: Page) {
        this.deliveryTypes = page.locator('app-checkout-step-delivery').getByRole('tab');
        this.consignments = page.locator(':has( > .shipment-stepper)');

        this.pickupForm = new PickUpForm(page.locator(`
            app-pick-up,
            app-pick-up-manual,
            app-dpd-parcel-machine,
            app-omniva-parcel-machine,
            app-chile-express-pick-up
        `));
        this.storesList = page.locator('ul.pickup-stores:visible, ul.delivery-point-of-services_list:visible');
        this.storeItems = this.storesList.getByRole('listitem');
        this.deliveryPaginatorNext = page.locator('.mat-mdc-paginator-navigation-next');
        this.deliveryPaginatorBack = page.locator('.mat-mdc-paginator-navigation-previous');
        this.storeServicesList = page.locator('ul.pickup-stores-services:visible');
        this.storeServiceItem = this.storeServicesList.getByRole('listitem');

        const calendarModal = page.locator('.delivery-info-calendar');
        this.calendar = Object.assign(calendarModal, {
            datePicker: calendarModal.getByRole('gridcell'),
            calendarList: calendarModal.locator('.info-checkbox'),
            applyBtn: calendarModal.getByRole('button').and(calendarModal.locator('[data-an-la="delivery date popup:apply"], .continue-btn')),
            cancelBtn: calendarModal.getByRole('button').and(calendarModal.locator('.button[data-an-la="delivery date popup:close"]'))
        })
    }

    get url() {
        return this.page.context().checkoutURL + '?step=CHECKOUT_STEP_DELIVERY';
    }

    deliveryType(type: string) {
        const anla = this.page.locator(`[data-an-la*="${type}"i]`);
        const img = this.page.locator(`img[class="${type}"i]`);
        const icon = this.page.locator(`[svgicon="${type}"i]`);
        return this.deliveryTypes.filter({ has: anla.or(img).or(icon) });
    }

    consignment(line: number) {
        return new Consignment(this.consignments.nth(line - 1));
    }

    private async waitForNotBusy() {
        const busy = this.page.locator('.busy:visible');
        if (await busy.count()) {
            await busy.waitFor({ state: 'hidden' }).catch(() => { });
        }
    }

    async selectDeliveryOption(consignment: number, option: ItemLocator) {
        await this.consignment(consignment).deliveryOption(option).click({ position: { x: 32, y: 24 } });
        await this.page.waitForTimeout(1000);
        await this.waitForNotBusy();
    }

    async selectDeliveryService(consignment: number, service: ItemLocator) {
        await this.consignment(consignment).deliveryService(service).click({ position: { x: 32, y: 24 } });
        await this.page.waitForTimeout(1000);
        await this.waitForNotBusy();
    }

    async selectDeliverySlot(consignment: number, option: number) {
        await this.consignment(consignment).deliverySlot(option).click({ position: { x: 32, y: 24 } });
        await this.page.waitForTimeout(1000);
        await this.waitForNotBusy();
    }
}

export interface DeliveryOption extends Locator {
    readonly name: Locator;
    readonly price: Locator;
}

export interface DeliveryService extends Locator {
    readonly name: Locator;
    readonly price: Locator;
}

export class PickUpForm extends Form {
    constructor(form: Locator) {
        super(form);
    }

    async autoFill(data: Record<string, any> = {}) {
        for (const field of await this.fields.all()) {
            if (await Form.isReadOnly(field)) continue;
            const name = await field.getAttribute('formcontrolname') || await field.getAttribute('name');
            if (await field.getAttribute('role') === 'combobox') {
                await Form.selectCombobox(field, data[name!]);
            } else {
                await field.fill(data[name!]);
            }
        }
    }
}

export interface Calendar extends Locator {
    readonly datePicker: Locator;
    readonly calendarList: Locator;
    readonly applyBtn: Locator;
    readonly cancelBtn: Locator;
}

export class Consignment {
    readonly shipmentNo: Locator;
    readonly deliveryList: Locator;
    readonly deliveryOptions: Locator;
    readonly deliverySlotList: Locator;
    readonly deliverySlots: Locator;
    readonly seeMoreDeliverySlotBtn: Locator;
    readonly deliveryServiceList: Locator;
    readonly deliveryServices: Locator;
    readonly deliveryProductInfo: Locator;

    constructor(readonly section: Locator) {
        this.shipmentNo = section.locator('.shipment-stepper');
        this.deliveryList = section.locator('.delivery_list');
        this.deliveryOptions = section.locator('.delivery_list li');
        this.deliverySlotList = section.locator('.slot_list');
        this.deliverySlots = section.locator('.slot_list li');
        this.seeMoreDeliverySlotBtn = section.locator('[data-an-la*="see more delivery slot"i], [data-an-la*="Meer tijdsloten voor bezorging bekijken"], [data-an-la="delivery date:specify date"]');
        this.deliveryServiceList = section.locator('.service_list');
        this.deliveryServices = section.locator('.service_list li .delivery-service-tab');
        this.deliveryProductInfo = section.locator('.info-product-details-wrapper');
    }

    deliveryOption(option: ItemLocator) {
        let optionLocator: Locator;
        if (typeof option === 'number') {
            optionLocator = this.deliveryOptions.nth(option - 1);
        } else {
            const code = this.section.page().locator(`code=${option}`);
            optionLocator = this.deliveryOptions.filter({ has: code });
        }
        return Object.assign(optionLocator, {
            name: optionLocator.locator('.delivery-mode-name-text'),
            price: optionLocator.locator('.delivery-mode-price, .span-left')
        });
    }

    deliverySlot(option: number) {
        const opt = this.deliverySlots.nth(option - 1);
        return Object.assign(opt, {
            date: opt.locator('.delivery-dates-date'),
            time: opt.locator('.delivery-dates-time'),
            price: opt.locator('.delivery-dates-price')
        });
    }

    deliveryService(service: ItemLocator) {
        let serviceLocator: Locator;
        if (typeof service === 'number') {
            serviceLocator = this.deliveryServices.nth(service - 1);
        } else {
            const code = this.section.page().locator(`code=${service}`);
            serviceLocator = this.deliveryServices.filter({ has: code });
        }
        return Object.assign(serviceLocator, {
            name: serviceLocator.locator('.delivery-service-name-text'),
            price: serviceLocator.locator('.delivery-service-price')
        });
    }
}
