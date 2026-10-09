import type { Locator, Page } from 'playwright';

export interface SMCOption extends Locator {
    name: Locator;
    code: Locator;
    summary: Locator;
    priceText: Locator;
}

export default class SCP {
    readonly modal: Locator;
    readonly title: Locator;
    readonly xButton: Locator;
    readonly optionLocator: Locator;
    readonly options: SMCOption;
    readonly termsAndConditions: Locator;
    readonly confirmBtn: Locator;

    constructor(readonly page: Page) {
        this.modal = this.page.locator(`
            #hubble-care,
            #hubble-care-layer,
            app-samsung-care,
            app-samsung-care-v2,
            app-samsung-care-v3
        `).filter({ visible: true });
        this.title = this.modal.locator(page.locator('.hubble-pd-popup__title, .modal__title'));
        this.xButton = this.modal.locator(page.locator('.hubble-pd-popup__close, .hubble-care-popup__close, .modal__close'));
        this.optionLocator = this.modal.locator('.option-box');
        this.options = this.smcOption(this.optionLocator);
        this.termsAndConditions = this.modal.locator(page.getByRole('checkbox'));
        this.confirmBtn = this.modal.locator(page.locator(`
            [an-la="samsung care:confirm"],
            [data-an-la^="samsung care:"][data-an-la$="confirm"],
            [data-an-la="samsung care:confirm"],
            [data-an-la="samsung care:Monatlich Samsung Care+:confirm"]
        `));
    }

    private smcOption(locator: Locator): SMCOption {
        return Object.assign(locator, {
            name: locator.locator('.option-box__name'),
            code: locator.locator('.option-box__code'),
            summary: locator.locator('.option-box__summary'),
            priceText: locator.locator('.option-box__price'),
        });
    }

    option(option: number | string | LocatorFilter = 1): SMCOption {
        switch (typeof option) {
            case 'number':
                return this.smcOption(this.optionLocator.nth(option - 1));
            case 'string':
                return this.smcOption(this.optionLocator.filter({ has: this.page.getByText(option, { exact: true }) }));
            default:
                return this.smcOption(this.optionLocator.filter(option).first());
        }
    }

    button(name: string): Locator {
        return this.modal.getByRole('button', { name, exact: true });
    }

    async checkTermsAndConditions() {
        for (const term of await this.termsAndConditions.all()) {
            await term.evaluate(e => e.scrollIntoView({ block: 'center' }), { timeout: 3000 }).catch(() => { });
            await term.check({ force: true }).catch(async () => {
                await term.evaluate(e => (e as HTMLInputElement).click());
            });
        }
    }
}
