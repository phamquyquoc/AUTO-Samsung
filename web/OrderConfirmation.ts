import type { Locator } from 'playwright';
import { type Page } from 'fixtures';
import Recommendation from 'Recommendation';

export class UpdatePaymentDetail {
    readonly section: Locator;
    readonly inputCardNumber;
    readonly inputName;
    readonly inputExpireDate;
    readonly inputCVV;
    readonly termAndCondition;
    readonly submitBtn;

    constructor(readonly page: Page) {
        this.section = page.locator('app-sc-subscription-payment-v2:visible, app-update-payment-detail:visible');
        this.inputCardNumber = this.section.locator(`
            iframe[title="Iframe for card number"],
            iframe[title="Iframe for kortnummer"],
            iframe[title="Iframe för kortnummer"],
            iframe[title="Iframe per il numero di carta"],
            iframe[title="Iframe til kortnummer"],
            iframe[title="Iframe für Kartennummer"]`).contentFrame().getByRole('textbox');
        this.inputName = this.section.locator('.input-holder-name');
        this.inputExpireDate = this.section.locator(`
            iframe[title="Iframe for expiry date"],
            iframe[title="Iframe for utløpsdato"],
            iframe[title="Iframe for utgångsdatum"],
            iframe[title="Iframe för utgångsdatum"],
            iframe[title="Iframe per data di scadenza"],
            iframe[title="Iframe til udløbsdato"],
            iframe[title="Iframe für Ablaufdatum"]`).contentFrame().getByRole('textbox');
        this.inputCVV = this.section.locator(`
            iframe[title="Iframe for security code"],
            iframe[title="Iframe for sikkerhetskode"],
            iframe[title="Iframe for säkerhetskod"],
            iframe[title="Iframe för säkerhetskod"],
            iframe[title="Iframe per il codice di sicurezza"],
            iframe[title="Iframe til sikkerhedskode"],
            iframe[title="Iframe für Sicherheitscode"]`).contentFrame().getByRole('textbox');
        this.termAndCondition = this.section.getByRole('checkbox');
        this.submitBtn = this.section.locator(`
            [data-an-la*="samsung care payment:update payment details"],
            [data-an-la*="payment:pay now"]
        `);
    }
}

/**
 * Order Confirmation page
 */
class OrderConfirmation {
    readonly orderNumberSummary: Locator;
    readonly orderNumber: Locator;
    readonly reviewOrderBtn: Locator;

    readonly orderSummary: Locator;
    readonly priceSummary: Locator;
    readonly rewardSummary: Locator;
    readonly customerService: Locator;

    readonly updatePayment: UpdatePaymentDetail;
    readonly recommendation: Recommendation;
    readonly joinMembership: Locator;

    constructor(readonly page: Page) {
        this.orderNumberSummary = page.locator('.order-number-summary');
        this.orderNumber = page.locator('.order-number a, .text-button a');
        this.reviewOrderBtn = page.locator(`[data-an-la="order confirmation:review orders"]`);

        this.orderSummary = page.locator('.order-summary');
        this.priceSummary = page.locator('app-price-summary');
        this.rewardSummary = page.locator('app-rewards-summary-v2:visible');
        this.customerService = page.locator('app-customer-service:visible');

        this.updatePayment = new UpdatePaymentDetail(page);
        this.recommendation = new Recommendation(page.locator('main app-product-recommendation-v2'));
        this.joinMembership = page.locator('app-join-membership');
    }
}

export default OrderConfirmation;
