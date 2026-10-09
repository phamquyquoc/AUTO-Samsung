import type { Locator } from 'playwright';
import { expect, type Page } from 'fixtures';
import type { Checkbox, FormField, Radio } from './Form';

import Address from './Address';
import CustomerInfo from './CustomerInfo';
import Delivery from './Delivery';
import { CheckoutRHS } from './RHS';
import Form from './Form';
import { VoucherPopup } from 'Cart';

const FORMS = [
    'app-customer-info-v2',
    'app-customer-address-v2',
    'app-customer-address-v2-kz',
    'app-billing-address-v2',
    'app-checkout-identification',
    'app-checkout-invoice',
    'app-checkout-tnc',
    'app-checkout-step-trade-in',
    'app-checkout-step-trade-in-details-at',
    'app-checkout-step-samsung-care',
    'app-checkout-step-smc-details',
    'app-checkout-step-sim',
    'app-step-leasing-evollis',
    'app-checkout-step-delivery',
    'app-delivery-info',
    'app-delivery-info-additional-location-info',
    'app-delivery-info-delivery-first',
    'app-delivery-info-pickup-first',
    'app-delivery-info-no-pickup-split',
    'app-nshift',
    'app-pick-up',
    'app-pick-up-manual',
    'app-dpd-parcel-machine',
    'app-omniva-parcel-machine',
    'app-chile-express-pick-up'
];

const noop = () => { };

/**
 * Checkout page (Hybrid)
 */
class Checkout {
    readonly customerInfo: CustomerInfo;
    readonly shippingAddress: ShippingAddress;
    readonly billingAddress: BillingAddress;
    readonly identification: Identification;
    readonly invoice: Invoice;
    readonly tradeInForm: TradeInForm;
    readonly scpForm: SCPForm;
    readonly simForm: SIMForm;
    readonly delivery: Delivery;
    readonly rhs: CheckoutRHS;
    readonly voucherPopup: VoucherPopup;

    readonly samsungLogo: Locator;
    readonly headerLinks: Locator;
    readonly checkoutComponent: Locator;
    readonly paymentType: Locator;
    readonly footer: Locator;
    readonly main: Locator;
    readonly contactInfoHeader: Locator;
    readonly deliveryHeader: Locator;
    readonly currentStepBody: Locator;
    readonly termsAndConditions: Checkbox;
    readonly paymentStep: Locator;
    readonly nextBtn: Locator;
    readonly nifInput: Locator;
    readonly nifField: Locator;

    protected forms: Set<string>;

    constructor(readonly page: Page) {
        this.customerInfo = new CustomerInfo(page.locator('app-customer-info-v2'));
        this.shippingAddress = new ShippingAddress(page.locator('app-customer-address-v2, app-customer-address-v2-kz'));
        this.billingAddress = new BillingAddress(page.locator('app-billing-address-v2'));
        this.identification = new Identification(page.locator('app-checkout-identification'));
        this.invoice = new Invoice(page.locator('app-checkout-invoice'));
        this.tradeInForm = new TradeInForm(page.locator('app-checkout-step-trade-in, app-checkout-step-trade-in-details-at'));
        this.scpForm = new SCPForm(page.locator('app-checkout-step-samsung-care, app-checkout-step-smc-details'));
        this.simForm = new SIMForm(page.locator('app-checkout-step-sim'));
        this.delivery = new Delivery(page);
        this.rhs = new CheckoutRHS(page.locator('.RightContentCheckoutSlot'));
        this.voucherPopup = new VoucherPopup(page.locator('app-voucher-code-modal:visible'));

        this.samsungLogo = this.page.locator('[data-an-la="logo"]');
        // checkout replaces the storefront GNB with a header that carries the logo and nothing else
        this.headerLinks = this.page.locator('header a:visible, header button:visible');
        this.checkoutComponent = this.page.locator('app-checkout-one');
        this.paymentType = this.page.locator('app-payment-type');
        this.footer = this.page.locator('footer');
        this.main = this.samsungLogo.or(this.checkoutComponent).or(this.rhs.section);
        this.contactInfoHeader = this.page.locator('app-checkout-step-contact-info-header');
        this.deliveryHeader = this.page.locator('app-checkout-step-delivery-header, app-checkout-step-delivery-header-mx');
        this.currentStepBody = page.locator('app-step-checkout-container-body');
        this.termsAndConditions = Form.checkbox(page.locator('app-checkout-tnc'));
        this.paymentStep = page.locator('app-checkout-step-payment');
        this.nextBtn = page.locator(`
            .customer-details--continue-btn,
            .delivery-details--continue-btn,
            .search-delivery-options-btn,
            .trade-in--continue-btn,
            .smc-step--continue-btn,
            [data-an-la^="sim-plan details:continue"i],
            [data-an-la="rent:new contract"],
            [data-an-la="sim:continue to payment"]
        `);
        // PT NIF (fiscal code) shown at the delivery/billing step; must be filled before Continue enables
        this.nifInput = page.locator('input[name="fiscalCode"]:visible').first();
        this.nifField = page.locator('mat-form-field.fiscal-code-field, mat-form-field:has(input[name="fiscalCode"])').first();

        this.forms = new Set(FORMS);
    }

    get url() {
        return this.page.context().checkoutURL;
    }

    async applyCoupon(coupon: string) {
        await this.rhs.couponCodeInput.fill(coupon);
        await this.rhs.applyCouponBtn.click();
        await this.page.waitForTimeout(1000);
        await this.rhs.applyCouponSpinner.waitFor({ state: 'hidden' });
    }

    async fillFiscalCode(value: string | number = this.page.context().profile.customerInfo.fiscalCode) {
        if (!await this.nifInput.count()) return false;
        const digits = String(value ?? '').replace(/\D/g, '');
        if (!digits) return false;
        if ((await this.nifInput.inputValue().catch(() => '')).replace(/\D/g, '') === digits) return true;
        await expect(async () => {
            await this.nifInput.click({ timeout: 5000 });
            await this.nifInput.press('Control+a');
            await this.nifInput.press('Delete');
            await this.nifInput.pressSequentially(digits, { delay: 50, timeout: 10000 });
            await this.nifInput.blur();
            await expect(this.nifField.locator('mat-error:visible'), 'Fiscal code validation failed').toHaveText([], { timeout: 5000 });
        }, 'Fiscal code could not be filled').toPass({ timeout: 60000 });
        console.log(`Field fiscalCode filled: ${digits}`);
        return true;
    }

    async acceptTermsAndConditions() {
        const section = this.page.locator('app-checkout-tnc');
        for (const link of await section.locator('.enable-visited-link a:visible').all()) {
            await link.click({ timeout: 5000 });
            await this.page.locator('.modal__close').click({ timeout: 5000 });
        }
        for (const term of await this.termsAndConditions.all()) {
            if (!await Form.isRequired(term)) continue;
            await term.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(noop);
            await term.check({ force: true, position: { x: 12, y: 12 }, timeout: 5000 });
        }
    }

    private async selectDeliveryInfo() {
        const count = await this.delivery.consignments.count();
        console.log(`Found ${count} consignments`);
        for (let line = 1; line <= count; line++) {
            const consignment = this.delivery.consignment(line);
            const selected = this.page.locator('.selected-mode');
            if (await consignment.deliveryList.filter({ hasNot: selected }).count()) {
                await this.delivery.selectDeliveryOption(line, 1);
                await this.waitForLoad();
                await consignment.deliverySlotList.waitFor({ timeout: 3000 }).catch(noop);
            }
            if (await consignment.deliverySlotList.filter({ hasNot: selected }).count()) {
                await this.delivery.selectDeliverySlot(line, 1);
                await this.waitForLoad();
                await consignment.deliveryServiceList.waitFor({ timeout: 3000 }).catch(noop);
            }
        }
    }

    private async process() {
        const profile = this.page.context().profile;
        const locator = this.page.locator(Array.from(this.forms).join(',')).filter({ visible: true });
        for (const form of await locator.all()) {
            const formID = await form.evaluate(e => e.tagName.toLowerCase());
            if (!this.forms.has(formID)) continue;
            switch (formID) {
                case 'app-customer-info-v2':
                    console.log('Processing customer info');
                    await this.customerInfo.autoFill(profile.customerInfo);
                    await expect(this.customerInfo.fields.errorMessage, 'Customer info validation failed').toHaveText([]);
                    this.forms.delete('app-customer-info-v2');
                    break;
                case 'app-customer-address-v2':
                case 'app-customer-address-v2-kz':
                    console.log('Processing customer address');
                    await this.shippingAddress.savedAddressesList.or(this.shippingAddress.fields.first()).waitFor({ timeout: 20000 });
                    await this.shippingAddress.autoFill(profile.customerAddress);
                    await expect(this.shippingAddress.fields.errorMessage, 'Shipping address validation failed').toHaveText([]);
                    if (await this.invoice.form.isVisible()) {
                        await this.selectDeliveryInfo();
                    }
                    this.forms.delete('app-customer-address-v2');
                    this.forms.delete('app-customer-address-v2-kz');
                    break;
                case 'app-billing-address-v2':
                    console.log('Processing billing address');
                    const enterManually = profile.billingAddress?.enterManually;
                    if (enterManually === true && await this.billingAddress.manualAddressBtn.isVisible()) {
                        await this.billingAddress.manualAddressBtn.click();
                    } else if (enterManually === false && await this.billingAddress.viaSearchAdressBtn.isVisible()) {
                        await this.billingAddress.viaSearchAdressBtn.click();
                    }
                    await this.billingAddress.autoFill({ ...profile.customerInfo, ...profile.billingAddress });
                    await expect(this.billingAddress.fields.errorMessage, 'Billing address validation failed').toHaveText([]);
                    if (await this.page.locator('.country-specific-pickup').isVisible()) break;
                    if (!this.forms.has('app-delivery-info-pickup-first')) {
                        await expect(this.delivery.consignments.first(), 'Delivery consignments not displayed').toBeVisible({ timeout: 20000 });
                        await this.selectDeliveryInfo();
                    }
                    this.forms.delete('app-billing-address-v2');
                    break;
                case 'app-checkout-identification':
                    console.log('Processing identification');
                    await this.identification.fill(profile.customerInfo)
                    this.forms.delete('app-checkout-identification');
                    break;
                case 'app-checkout-invoice':
                    console.log('Processing checkout invoice');
                    if (await this.invoice.generalInvoice.isVisible()) {
                        await this.invoice.generalInvoice.click();
                    }
                    this.forms.delete('app-checkout-invoice');
                    break;
                case 'app-checkout-tnc':
                    console.log('Processing terms and conditions');
                    await this.acceptTermsAndConditions();
                    this.forms.delete('app-checkout-tnc');
                    break;
                case 'app-checkout-step-trade-in':
                case 'app-checkout-step-trade-in-details-at':
                    console.log('Processing Trade-in form');
                    await this.tradeInForm.fill(profile.tradeInData);
                    this.forms.delete('app-checkout-step-trade-in');
                    this.forms.delete('app-checkout-step-trade-in-details-at');
                    break;
                case 'app-checkout-step-samsung-care':
                case 'app-checkout-step-smc-details':
                    console.log('Processing samsung care form');
                    for (const field of await form.getByRole('combobox').all()) {
                        await Form.selectCombobox(field, 1);
                    }
                    await this.scpForm.fill(profile.scpInfo!);
                    for (const cbx of await this.scpForm.form.getByRole('checkbox').all()) {
                        await cbx.check({ force: true });
                    }
                    break;
                case 'app-checkout-step-sim':
                    console.log('Processing SIM form');
                    if (await this.simForm.startApplicationBtn.count()) {
                        await this.simForm.startApplicationBtn.click();
                    }
                    await this.simForm.fill(profile.simInfo!);
                    this.forms.delete('app-checkout-step-sim');
                    break;
                case 'app-checkout-step-delivery':
                    await form.locator(`
                        app-delivery-info,
                        app-delivery-info-delivery-first,
                        app-delivery-info-pickup-first,
                        app-delivery-info-no-pickup-split
                    `).waitFor({ timeout: 20000 }).catch(() => { throw new Error('Delivery step loading error') });
                    for (const cbx of await this.page.locator('.delivery-info__tnc mat-checkbox input').all()) {
                        await cbx.check({ force: true, timeout: 5000 });
                    }
                    break;
                case 'app-delivery-info-delivery-first':
                    console.log('Processing delivery first');
                    await form.locator('[name="postcode"]').fill(profile.customerAddress.postalCode);
                    await form.click({ force: true, position: { x: 0, y: 0 } });
                    const btn = this.page.locator('.search-delivery-options-btn');
                    const handle = await btn.elementHandle();
                    await btn.click();
                    await handle?.waitForElementState('hidden');
                    this.forms.delete('app-delivery-info-delivery-first');
                    return true;
                case 'app-delivery-info-pickup-first':
                    if (!this.forms.has('app-customer-address-v2-kz')) break;
                    await expect(this.page.locator('app-customer-address-v2, app-billing-address-v2, app-checkout-invoice').first()).toBeVisible({ timeout: 20000 });
                    this.forms.delete('app-delivery-info-pickup-first');
                    return true;
                case 'app-delivery-info':
                case 'app-delivery-info-no-pickup-split':
                    await expect(this.delivery.consignments.first(), 'Delivery consignments not displayed').toBeVisible({ timeout: 20000 });
                    await this.selectDeliveryInfo();
                    break;
                case 'app-nshift':
                    await this.selectDeliveryInfo();
                    break;
                case 'app-pick-up':
                case 'app-pick-up-manual':
                    console.log('Processing pickup form');
                    await this.delivery.pickupForm.fields.first().or(this.delivery.storeItems.first()).waitFor({ timeout: 10000 }).catch(noop);
                    if (await this.delivery.pickupForm.fields.count() > 0) {
                        await this.delivery.pickupForm.autoFill(profile.pickupData);
                    }
                    await this.delivery.storesList.waitFor({ timeout: 20000 }).catch(noop);
                    if (profile.pickupData?.storeName) {
                        await this.delivery.storeItems.filter({ hasText: profile.pickupData.storeName }).first().click();
                    } else {
                        await this.delivery.storeItems.first().click();
                    }
                    break;
                case 'app-dpd-parcel-machine':
                case 'app-omniva-parcel-machine':
                case 'app-chile-express-pick-up':
                    console.log('Processing country specific pickup');
                    await this.delivery.pickupForm.autoFill(profile.pickupData);
                    await this.delivery.storesList.waitFor({ timeout: 20000 }).catch(noop);
                    if (profile.pickupData?.storeName) {
                        await this.delivery.storeItems.filter({ hasText: profile.pickupData.storeName }).first().click();
                    }
                    break;
            }
        }
    }

    async nextStep() {
        await expect(this.nextBtn, 'Next button is not enabled').toBeEnabled();
        const stepBody = await this.currentStepBody.elementHandle();
        await this.nextBtn.click({ timeout: 5000 });
        console.log('Next button is clicked');
        await this.page.waitForFunction((elm) => {
            if (!document.contains(elm)) return true;
            if (document.querySelector('mat-error')) throw 'Form validation failed';
            if (document.querySelector('ul.ng-invalid')) throw 'Form validation failed';
            const error = document.querySelector<any>('app-checkout-message:has([svgicon*="delete"])');
            if (error) {
                error.querySelector('[svgicon*="delete"]')?.click();
                throw error.innerText;
            }
        }, stepBody, { timeout: 20000 }).catch(e => { throw new Error(e.message.replace('page.waitForFunction: ', '')) });
        console.log('Navigated to next step');
        await this.nextBtn.or(this.simForm.startApplicationBtn).or(this.paymentStep).waitFor();
        console.log('Next step loaded success');
    }

    private async continueToStep(step: string) {
        for (let tries = 1; tries <= 3; tries++) {
            try {
                if (this.page.url().includes(step)) {
                    console.log(`Navigated to ${step}`);
                    break;
                }
                const locator = this.page.locator(FORMS.join(',')).filter({ visible: true });
                await expect(locator.first(), 'Checkout forms not displayed').toBeVisible({ timeout: 20000 });
                const result = await this.process();
                if (result === true) {
                    tries = 0;
                    continue;
                }
                await this.nextStep();
                tries = 0;
            } catch (error) {
                if (tries == 3) throw error;
                await this.page.waitForTimeout(3000);
            }
        }
    }

    async continueUntil(form: string) {
        for (let tries = 1; tries <= 3; tries++) {
            try {
                if (this.page.url().includes('STEP_PAYMENT')) throw new Error(`Form ${form} not found`);
                const locator = this.page.locator(FORMS.join(',')).filter({ visible: true });
                await expect(locator.first(), 'Checkout forms not displayed').toBeVisible({ timeout: 20000 });
                if (await this.page.locator(form).isVisible()) {
                    console.log(`Form ${form} is displayed`);
                    break;
                }
                const result = await this.process();
                if (result === true) {
                    tries = 0;
                    continue;
                }
                await this.nextStep();
                tries = 0;
            } catch (error) {
                if (tries == 3) throw error;
                await this.page.waitForTimeout(3000);
            }
        }
    }

    async continueToContactInfo(reset = false) {
        if (reset) this.reset();
        await this.continueToStep('STEP_CONTACT_INFO');
    }

    async continueToDelivery(reset = false) {
        if (reset) this.reset();
        await this.continueToStep('STEP_DELIVERY');
    }

    async continueToTradeInStep(reset = false) {
        if (reset) this.reset();
        await this.continueToStep('STEP_TRADE_IN');
    }

    async continueToPayment(reset = false) {
        if (reset) this.reset();
        await this.continueToStep('STEP_PAYMENT');
    }

    reset() {
        this.forms = new Set(FORMS);
    }

    async waitForLoad() {
        for (let tries = 1; tries <= 2; tries++) {
            try {
                await this.rhs.totalAmount.waitFor({ timeout: 30000 });
                await this.page.waitForFunction(() =>
                    !document.querySelector('app-skeleton-loader:not([hidden])') &&
                    !document.querySelector('mat-spinner'),
                    null, { timeout: 30000 }
                );
                await this.page.waitForTimeout(2000);
            } catch {
                if (tries == 2) throw new Error('Checkout page is not loaded successfully');
                await this.page.reload();
            }
        }
    }
}

interface SavedAddressesList extends Locator {
    readonly previousBtn: Locator;
    readonly nextBtn: Locator;
}

interface SavedAddress extends Locator {
    readonly radio: Locator;
    readonly editBtn: Locator;
    first(): SavedAddress;
    last(): SavedAddress;
    nth(index: number): SavedAddress;
}

export class ShippingAddress extends Address {
    readonly savedAddressRadio: Radio;
    readonly newAddressRadio: Radio;
    readonly manualAddressBtn: Locator;
    readonly viaSearchAdressBtn: Locator;
    readonly saveAddressCbx: Checkbox;

    readonly savedAddressesList: SavedAddressesList;
    readonly savedAddresses: SavedAddress;
    readonly saveChangeBtn: Locator;
    readonly cancelBtn: Locator;

    constructor(form: Locator) {
        super(form);
        this.savedAddressRadio = this.radio('SAVED_ADDRESS');
        this.newAddressRadio = this.radio('NEW_ADDRESS');
        this.manualAddressBtn = form.locator('[data-an-la="checkout:customer details:enter address manually"]:visible, button:has-text("introduzir morada manualmente"):visible').first();
        this.viaSearchAdressBtn = form.locator('[data-an-la="checkout:customer details:enter address via search"]:visible, button:has-text("pesquis"):visible, button:has-text("procur"):visible').first();
        this.saveAddressCbx = this.checkbox('saveInAddressBook');

        const savedAddressesList = form.locator('app-address-list-v2');
        this.savedAddressesList = Object.assign(savedAddressesList, {
            previousBtn: savedAddressesList.locator('mat-paginator button:first-of-type'),
            nextBtn: savedAddressesList.locator('mat-paginator button:last-of-type'),
        });
        this.savedAddresses = this.savedAddress(savedAddressesList.locator('.address-box:visible'));

        this.saveChangeBtn = form.locator('[data-an-la="checkout:customer details:save change"]');
        this.cancelBtn = form.locator('[data-an-la="checkout:customer details:cancel"]');
    }

    private savedAddress(locator: Locator): SavedAddress {
        const { first, last, nth } = locator;
        return Object.assign(locator, {
            radio: locator.getByRole('radio'),
            editBtn: locator.locator('.actions__edit'),
            first: () => this.savedAddress(first.bind(locator)()),
            last: () => this.savedAddress(last.bind(locator)()),
            nth: (index: number) => this.savedAddress(nth.bind(locator)(index)),
            click: (options?: any) => locator.locator('label').click(options),
        });
    }

    override async autoFill(data: Record<string, any>) {
        await this.form.getByRole('textbox').or(this.form.getByRole('combobox')).or(this.form.getByRole('radio')).or(this.form.getByRole('checkbox')).first().waitFor();
        await super.autoFill(new Proxy(data, {
            get(target, prop) {
                switch (prop) {
                    case 'shippingCityName':
                        return target.town;
                    case 'shippingDistrictName':
                        return target.district;
                }
                return Reflect.get(target, prop);
            }
        }));
    }
}

export class BillingAddress extends ShippingAddress {
    readonly sameAsShippingAddressCbx: Checkbox;
    readonly taxInvoiceCbx: Checkbox;
    readonly personalInvoiceCbx: Checkbox;
    readonly companyInvoiceCbx: Checkbox;

    constructor(form: Locator) {
        super(form);
        this.sameAsShippingAddressCbx = this.checkbox('sameAsShipping');
        this.taxInvoiceCbx = this.checkbox('isUserWantTaxInvoice');
        this.personalInvoiceCbx = this.checkbox('personalInvoice');
        this.companyInvoiceCbx = this.checkbox('companyInvoice');
    }

    override async autoFill(data: Record<string, any>) {
        await super.autoFill(new Proxy(data, {
            get(target, prop) {
                switch (prop) {
                    case 'titleCode':
                        return target.title;
                    case 'phone':
                        return target.phoneNumber;
                    case 'billingCityName':
                        return target.town;
                    case 'billingDistrictName':
                        return target.district;
                }
                return Reflect.get(target, prop);
            }
        }));
    }
}

export class Identification extends Form {
    readonly documentType: FormField;
    readonly fiscalCode: FormField;

    constructor(form: Locator) {
        super(form);
        this.documentType = this.field('documentType');
        this.fiscalCode = this.field('fiscalCode');
    }

    async fill(data: Record<string, any>) {
        if (await this.documentType.isVisible()) {
            await this.documentType.select(data.documentType);
        }
        if (await this.fiscalCode.isVisible()) {
            await this.fiscalCode.fill(data.fiscalCode);
        }
        await this.form.click({ force: true, position: { x: 0, y: 0 } });
    }
}

export class TradeInForm extends Form {
    constructor(form: Locator) {
        super(form);
    }
}

export class SCPForm extends Form {
    constructor(form: Locator) {
        super(form);
    }
}

export class SIMForm extends Form {
    readonly startApplicationBtn: Locator;

    constructor(form: Locator) {
        super(form);
        this.startApplicationBtn = form.locator('[data-an-la="checkout:sim:start application"]');
    }
}

export class Invoice extends Form {
    readonly personalInvoice: Radio;
    readonly companyInvoice: Radio;
    readonly generalInvoice: Radio;
    readonly companyName: FormField;
    readonly fiscalCode: FormField;

    constructor(form: Locator) {
        super(form);
        this.personalInvoice = this.radio('PERSONAL_INVOICE');
        this.companyInvoice = this.radio('COMPANY_INVOICE');
        this.generalInvoice = this.radio('GENERAL_INVOICE');
        this.companyName = this.field('billingCompanyName');
        this.fiscalCode = this.field('billingFiscalcode');
    }
}

export default Checkout;
