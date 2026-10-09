import type { Locator, Page } from 'playwright';

export interface WarrantyOption extends Locator {
    name: Locator;
    code: Locator;
    priceText: Locator;
}

export default class Warranty {
    readonly modal: Locator;
    readonly title: Locator;
    readonly xButton: Locator;
    readonly optionLocator: Locator;
    readonly options: WarrantyOption;
    readonly termsAndConditions: Locator;
    readonly confirmBtn: Locator;

    constructor(readonly page: Page) {
        this.modal = this.page.locator(`
            #extended-warranty-vd,
            app-extended-warranty-v2,
            app-samsung-care-v3
        `);
        this.title = this.modal.locator(page.locator('.hubble-pd-popup__title, .modal__title, .layer-popup__title'));
        this.xButton = this.modal.locator(page.locator('.hubble-pd-popup__close, .modal__close, .extended-warranty-popup-vd__close'));
        this.optionLocator = this.modal.locator('.pd-option-selector, .option-box');
        this.options = this.warrantyOption(this.optionLocator);
        this.termsAndConditions = this.modal.locator(page.getByRole('checkbox').or(page.locator('input[name="checkbox"]')));
        this.confirmBtn = this.modal.locator(`
            [data-an-la="extended warranty:add to cart"],
            [an-la="extended warranty:confirm"]
        `);
    }

    private warrantyOption(locator: Locator): WarrantyOption {
        return Object.assign(locator, {
            name: locator.locator('.pd-option-selector__main-text, .option-box__name'),
            code: locator.locator('.pd-option-selector__sku-text, .option-box__code'),
            priceText: locator.locator('.pd-option-selector__price-text, .option-box__price, .price-ux__price-current'),
        });
    }

    option(option: number | string = 1): WarrantyOption {
        return this.warrantyOption(typeof option === 'number'
            ? this.optionLocator.nth(option - 1)
            : this.optionLocator.filter({ has: this.page.getByText(option, { exact: true }) })
        );
    }

    async checkTermsAndConditions() {
        for (const term of await this.termsAndConditions.all()) {
            await term.evaluate(e => e.scrollIntoView({ block: 'center' }), { timeout: 3000 }).catch(() => { });
            const rtl = await term.evaluate(e => getComputedStyle(e).direction === 'rtl');
            const x = rtl ? await term.evaluate(e => e.parentElement!.getBoundingClientRect().width - 8) : 8;
            await term.check({ force: true, position: { x, y: 8 } });
        }
    }
}
