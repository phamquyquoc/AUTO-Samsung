import assert from 'assert';
import { expect, Locator, Page } from 'fixtures';
import { PaymentRHS } from './RHS';
import Form, { Checkbox } from './Form';

export interface PaymentModesType extends Locator {
    header: Locator;
    paymentModes: PaymentMode;
}

export interface PaymentMode extends Locator {
    header: Locator;
    title: Locator;
    promoMessage: Locator;
    content: Locator;
    expand(): Promise<void>;
}

class RewardsPayment {
    readonly appliedBanner: Locator;
    readonly redeemPointsInput: Locator;
    readonly redeemPointsBtn: Locator;

    constructor(readonly form: Locator) {
        this.appliedBanner = form.page().locator('#rewards-applied-banner');
        this.redeemPointsInput = form.locator('.rewards-input-field');
        this.redeemPointsBtn = form.locator('[data-an-la="payment method:samsung rewards"], [data-an-la^="payment:redeem points"]');
    }

    async redeemPoints(points: number) {
        await this.redeemPointsInput.fill(points.toString());
        await this.redeemPointsBtn.click();
    }
}

class RewardsConversion {
    readonly bannerDescription: Locator;
    readonly bannerLink: Locator;

    constructor(readonly form: Locator) {
        this.bannerDescription = form.locator('.banner-description');
        this.bannerLink = form.locator('.banner-link, [data-an-la="go to my rewards"]');
    }
}

const noop = () => { };

type PaymentModeName = string |
    'Amex' |
    'credit card' |
    'Mastercard' |
    'PayPal' |
    'VISA'

export default class Payment {
    readonly rhs: PaymentRHS;
    readonly rewards: RewardsPayment;
    readonly rewardsConversion: RewardsConversion;

    readonly paymentModesTypes: PaymentModesType;
    readonly paymentModes: PaymentMode;
    readonly expandedPayment: PaymentMode;
    readonly termsAndConditions: Checkbox;
    readonly supportPaymentBanner: Locator;
    readonly supportPaymentList: Locator;
    readonly paymentForm: Locator;
    readonly payNowBtn: Locator;

    constructor(readonly page: Page) {
        this.rhs = new PaymentRHS(page.locator('.RightContentCheckoutSlot'));
        this.rewards = new RewardsPayment(page.locator('app-payment-mode-rewards'));
        this.rewardsConversion = new RewardsConversion(page.locator('app-rewards-banner-v2, app-payment-mode-rewards-banner'));
        this.paymentModesTypes = Payment.modesType(page.locator('.payment-modes-type'));
        this.paymentModes = Payment.mode(page.locator('app-payment-modes, app-update-payment-detail').locator('mat-expansion-panel'));
        this.expandedPayment = Payment.mode(this.paymentModes.and(this.page.locator('.mat-expanded')));
        this.termsAndConditions = Form.checkbox(page.locator(`
            app-payment-modes-terms-and-conditions,
            app-tr-payment-modes-terms-and-conditions-v2,
            #hr-wsPayPaymentModeOptin
        `));
        this.supportPaymentBanner = page.locator('app-payment-type');
        this.supportPaymentList = this.supportPaymentBanner.getByRole('listitem');
        this.paymentForm = page.locator(`
            app-card-on-delivery-payment,
            app-cod-payment,
            app-payment-lacaixa,
            app-payment-mode-2cp2p,
            app-payment-mode-ae-installment,
            app-payment-mode-addi-pay,
            app-payment-mode-adyen-alipay,
            app-payment-mode-adyen-bancontact,
            app-payment-mode-adyen-ideal,
            app-payment-mode-adyen-klarna,
            app-payment-mode-adyen-klarna-installment,
            app-payment-mode-adyen-paypal,
            app-payment-mode-adyen-swish,
            app-payment-mode-affirm,
            app-payment-mode-afterpay,
            app-payment-mode-afterpay-installment,
            app-payment-mode-alfa-installments,
            app-payment-mode-bank-transfer,
            app-payment-mode-bankletter,
            app-payment-mode-billie-b2b,
            app-payment-mode-bizum,
            app-payment-mode-brokerage-installment,
            app-payment-mode-buynow-paylater,
            app-payment-mode-checkout-dot-com,
            app-payment-mode-checkout-dot-com-flow,
            app-payment-mode-cmi-credit-card,
            app-payment-mode-commerz,
            app-payment-mode-contactless,
            app-payment-mode-credit-card,
            app-payment-mode-credit-guradcc,
            app-payment-mode-cybersource-credit-card,
            app-payment-mode-cybersource-credit-card-hk,
            app-payment-mode-cybersource-credit-installment,
            app-payment-mode-cofidis,
            app-payment-mode-dvedo-installments,
            app-payment-mode-eip-installment,
            app-payment-mode-ewallet-napasa,
            app-payment-mode-fatourati,
            app-payment-mode-finance-now,
            app-payment-mode-finance-now-purple-visa,
            app-payment-mode-findomestic,
            app-payment-mode-flexi-card,
            app-payment-mode-float,
            app-payment-mode-floa-nx,
            app-payment-mode-floa3x4x,
            app-payment-mode-flow-khipu,
            app-payment-mode-flow-mach,
            app-payment-mode-flow-webpay,
            app-payment-mode-flow-yape,
            app-payment-mode-flowonepay,
            app-payment-mode-glow,
            app-payment-mode-google-pay,
            app-payment-mode-gmo-docomo,
            app-payment-mode-gmo-paypay,
            app-payment-mode-gopay,
            app-payment-mode-halyke-pay,
            app-payment-mode-halyk-epay-samsung-pay,
            app-payment-mode-hcid,
            app-payment-mode-heidi-pay,
            app-payment-mode-homecredit-installment,
            app-payment-mode-inbank,
            app-payment-mode-indodana,
            app-payment-mode-installment,
            app-payment-mode-installment-mor,
            app-payment-mode-ipay88,
            app-payment-mode-ipay88-ewallet,
            app-payment-mode-ipay88-installment,
            app-payment-mode-ipay88-sop,
            app-payment-mode-iris,
            app-payment-mode-iyzico-bank,
            app-payment-mode-iyzico-credit,
            app-payment-mode-iyzico-wallet,
            app-payment-mode-jp-gmo,
            app-payment-mode-kaspipay,
            app-payment-mode-kbank-credit-card,
            app-payment-mode-klarna,
            app-payment-mode-klarna-de,
            app-payment-mode-kredivo,
            app-payment-mode-kueski-pay,
            app-payment-mode-latitude,
            app-payment-mode-masterpass,
            app-payment-mode-mbway,
            app-payment-mode-mercado-cash,
            app-payment-mode-mercado-checkout-bnpl,
            app-payment-mode-mercado-checkout-pro,
            app-payment-mode-mercado-pago-credit,
            app-payment-mode-mercadopagopse,
            app-payment-mode-midtrans-credit-card-inst,
            app-payment-mode-midtrans-credit-debit-card,
            app-payment-mode-mobile-pay,
            app-payment-mode-moyasar-samsung-pay,
            app-payment-mode-multibanco,
            app-payment-mode-neweb-pay,
            app-payment-mode-newebpay-credit-card-tw,
            app-payment-mode-ngenius-samsung-pay,
            app-payment-mode-oney,
            app-payment-mode-p24-blik,
            app-payment-mode-p24-fast-bank-transfer,
            app-payment-mode-paidy,
            app-payment-mode-pago-efectivo,
            app-payment-mode-pay-just-now,
            app-payment-mode-payfortcreditcard,
            app-payment-mode-paygate,
            app-payment-mode-paymob,
            app-payment-mode-paydollar,
            app-payment-mode-paypal,
            app-payment-mode-paypal-credit,
            app-payment-mode-payu-google-pay,
            app-payment-mode-payu-installment,
            app-payment-mode-pl-santander,
            app-payment-mode-platon-payment-mode,
            app-payment-mode-pointspay,
            app-payment-mode-quotation,
            app-payment-mode-razer-installment,
            app-payment-mode-ro-pay-utraditional-bank,
            app-payment-mode-safetypay,
            app-payment-mode-samsung-pay,
            app-payment-mode-santander,
            app-payment-mode-simple-pay,
            app-payment-mode-simpaisa-ewallet,
            app-payment-mode-tabby-pay,
            app-payment-mode-tamara,
            app-payment-mode-tbi-bank,
            app-payment-mode-tbi-bnpl,
            app-payment-mode-tbi-credit-online,
            app-payment-mode-twint,
            app-payment-mode-twoc2p-bnpl-wallets,
            app-payment-mode-twoc2p-card-based-installment,
            app-payment-mode-valu-pay,
            app-payment-mode-vipps,
            app-payment-mode-wafacash-pay,
            app-payment-mode-walley-b2b,
            app-payment-mode-wechat-pay,
            app-payment-mode-windcave,
            app-payment-mode-zippay,
            app-payment-mode-pay-at-shop,
            app-privat-bank,
            app-ws-pay,
            corvus-pay,
            paypo-payment,
            payment-mode-cofidis-installment,
            payment-mode-credit-card-installment,
            payment-mode-cybersource-paypal,
            app-payment-mode-credit-card-lazy,
            payment-mode-hyperpaycc,
            app-payment-mode-zaincash,
            app-payment-mode-prepaid-credit-card,
            app-payment-mode-cobre-pse,
            app-payment-mode-payu-pay-v2
        `);
        this.payNowBtn = this.expandedPayment.getByRole('button').last();
    }

    static modesType(area: Locator): PaymentModesType {
        return Object.assign(
            area, {
            header: area.locator('.payment-modes-type__header'),
            paymentModes: this.mode(area.locator('mat-expansion-panel'))
        });
    }

    static mode(panel: Locator): PaymentMode {
        return Object.assign(
            panel, {
            header: panel.locator('.mat-expansion-panel-header'),
            title: panel.locator('.payment-title'),
            icon: panel.locator('.payment-image, img').first(),
            chevron: panel.locator('.mat-expansion-indicator'),
            promoMessage: panel.locator('app-promo-message'),
            content: panel.locator('.mat-expansion-panel-content:visible'),
            async expand() {
                const title = await this.title.textContent();
                if (await this.content.isVisible()) {
                    console.log(`Payment mode "${title}" is already expanded`);
                } else {
                    await this.header.click();
                    await expect(this.content).toBeVisible();
                    console.log(`Payment mode "${title}" expanded`);
                }
            }
        });
    }

    get url() {
        return this.page.context().checkoutURL + '?step=CHECKOUT_STEP_PAYMENT';
    }

    paymentModesType(hasText: string): PaymentModesType {
        return Payment.modesType(this.paymentModesTypes.filter({ hasText }));
    }

    paymentMode(name: string): PaymentMode {
        const title = this.page.getByText(name, { exact: true });
        const imgClass = this.page.locator(`.payment-image[class*="${name.replaceAll(' ', '')}"i]`);
        const imgAlt = this.page.locator(`.payment-image[alt*="${name}"i]`);
        return Payment.mode(this.paymentModes.filter({ has: title.or(imgClass).or(imgAlt) }).first());
    }

    async acceptTermAndConditions() {
        try {
            for (const term of await this.termsAndConditions.all()) {
                await term.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(noop);
                await this.page.waitForTimeout(500);
                await term.check({ force: true, position: { x: 8, y: 8 } });
            }
        } catch (cause) {
            throw new Error('Failed to accept terms and conditions', { cause });
        }
    }

    async process() {
        let targetUrl = /orderConfirmation/;
        const tagName = await this.paymentForm.evaluate(e => e.tagName.toLowerCase());
        switch (tagName) {
            case 'app-payment-mode-credit-card':
            case 'app-payment-mode-mercado-pago-credit':
            case 'app-payment-mode-checkout-dot-com':
            case 'app-payment-mode-checkout-dot-com-flow':
            case 'app-payment-mode-cmi-credit-card':
                await this.payWithCreditCard();
                break;

            case 'app-payment-mode-adyen-paypal':
            case 'app-payment-mode-paypal':
            case 'app-payment-mode-paypal-credit':
            case 'payment-mode-cybersource-paypal':
                await this.payWithPayPal();
                break;

            default:
                await this.acceptTermAndConditions();
                await expect(this.payNowBtn, 'Pay Now button is not enabled').toBeEnabled();
                await this.payNowBtn.click();
                await expect(this.page, 'Not navigated to order confirmation page').toHaveURL(targetUrl, { timeout: 60000 });
        }
    }

    async payWith(method: PaymentModeName) {
        const paymentMode = this.paymentMode(method);
        await expect(paymentMode, `${method} payment not found`).toBeVisible({ timeout: 30000 });
        await paymentMode.expand();
        await expect(this.paymentForm, 'Payment not loaded successfully').toBeVisible({ timeout: 30000 });
        await this.waitForLoad().catch(() => { throw new Error('Payment form not loaded successfully') });
        await this.process();
    }

    async handleCreditCardField(field: Locator, data: Record<string, any>) {
        const name = await field.evaluate(e => {
            for (const key of ['name', 'formcontrolname', 'id']) {
                if (e.hasAttribute(key)) return e.getAttribute(key);
            }
        });
        switch (name) {
            case 'phoneNumber':
                await field.fill(data.phoneNumber);
                break;

            case 'encryptedCardNumber':
            case 'cardNumber':
            case 'card-number':
            case 'cardnumber':
                await field.fill(data.cardNumber);
                break;

            case 'holderNameInput':
            case 'input-checkout__cardholderName':
            case 'cardholder-name':
            case 'cardHolderName':
            case 'cardName':
                await field.fill(data.holderName);
                break;

            case 'encryptedExpiryDate':
            case 'expirationDate':
            case 'card-expiry-date':
            case 'exp-date':
            case 'cardExpiry':
                await field.fill(data.expiryDate);
                break;

            case 'encryptedSecurityCode':
            case 'securityCode':
            case 'card-cvv':
            case 'cvc':
            case 'cardCvv':
                await field.fill(data.cvv);
                await field.blur();
                break;
            case 'password-input':
            case 'answer':
            case 'password':
                await field.fill(data.password);
                break;
        }
    }

    async payWithCreditCard() {
        const data = this.page.context().profile.creditCardData;
        assert(data, 'Please put credit card data in profile');
        const fields = this.expandedPayment.locator(this.page.getByRole('textbox').or(this.page.locator('iframe')).or(this.page.getByRole('combobox')));
        for (const field of await fields.all()) {
            if (await field.isHidden()) continue;
            if (await field.evaluate(e => e.tagName == 'IFRAME')) {
                const inputs = field.contentFrame().getByRole('textbox');
                for (const input of await inputs.all()) {
                    await this.handleCreditCardField(input, data);
                }
            } else {
                await this.handleCreditCardField(field, data);
            }
        }
        await this.page.waitForTimeout(2000);
        await this.acceptTermAndConditions();
        await this.page.waitForTimeout(2000);
        await this.payNowBtn.click();
        const handle = await this.page.waitForFunction((checkoutUrl) => {
            if (window.location.href.includes('orderConfirmation')) return true;
            if (window.location.href != checkoutUrl) return document.body;
            return document.querySelector(`#threeDS-modal-iframe, iframe[name="threeDSIframe"]`);
        }, this.page.url(), { timeout: 30000 });
        if (handle.asElement()) {
            let frame = await handle.asElement()!.contentFrame().catch(() => null);
            if (!frame) frame = this.page.mainFrame();
            if (frame) {
                try {
                    await frame.waitForLoadState('load');
                    if (frame.childFrames().length == 1) frame = frame.childFrames()[0];
                    const textboxs = frame.getByRole('textbox');
                    await expect.poll(() => textboxs.count(), { timeout: 15000 }).toBeGreaterThanOrEqual(1).catch(() => { });
                    if (await textboxs.first().isVisible()) {
                        for (const input of await textboxs.all()) {
                            await this.handleCreditCardField(input, data);
                        }
                    }
                    const submitBtn = frame.locator('button[type="submit"], input[type="submit"]');
                    if (await submitBtn.isVisible()) {
                        await submitBtn.click();
                    }
                } catch (e: any) {
                    if (!e?.message.includes('context or browser has been close')) throw e;
                }
            }
        }
        await this.page.waitForURL(/orderConfirmation/);
    }

    /**
     * The PayPal password comes from `.env` as `{SITE}_PAYPAL_PASSWORD`, the same shape the
     * Backoffice password uses. Sites that still keep it in their profile JSON keep working.
     */
    private payPalPassword(data: Record<string, any>) {
        const key = `${this.page.context().site.toUpperCase()}_PAYPAL_PASSWORD`;
        const password = process.env[key] || data.password;
        assert(password, `PayPal password is not set - put it in .env as ${key}`);
        return password;
    }

    async payWithPayPal() {
        const data = this.page.context().profile.paypalData;
        assert(data, 'Please put PayPal data in profile');
        await this.acceptTermAndConditions();
        await this.page.waitForTimeout(1000);
        const popupPromise = this.page.context().waitForEvent('page');
        await this.expandedPayment.frameLocator('iframe:visible').getByRole('link').click();
        const popup = await popupPromise;
        await popup.getByRole('textbox', { name: 'Email or mobile number' }).fill(data.email);
        await popup.getByRole('button', { name: 'Next' }).click();
        await popup.getByRole('textbox', { name: 'Password' }).fill(this.payPalPassword(data));
        await popup.getByRole('button', { name: 'Log In' }).click();
        await popup.getByRole('button', { name: 'Complete Purchase' }).click().catch(noop);
        await this.page.waitForURL(/orderConfirmation/);
    }

    async waitForLoad() {
        await this.rhs.totalAmount.waitFor();
        await this.page.waitForFunction(() =>
            !document.querySelector('app-skeleton-loader:not([hidden])') &&
            !document.querySelector('mat-spinner'),
            null, { timeout: 30000 }
        );
        await this.page.waitForTimeout(2000);
    }
}
