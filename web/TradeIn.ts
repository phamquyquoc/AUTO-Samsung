import { expect, Locator } from 'playwright/test';
import type { Page } from 'fixtures';
import { generateIMEI, randomIMEI } from './imei';

const noop = () => { };

export default class TradeIn {
    readonly modal: Locator;
    readonly title: Locator;
    readonly body: Locator;
    readonly xButton: Locator;
    readonly intro: Locator;
    readonly customer: Locator;
    readonly postalCodeInput: Locator;
    readonly instantDiscount: Locator;
    readonly cashbackDiscount: Locator;
    readonly tradeInType: Locator;
    readonly categories: Locator;
    readonly brands: Locator;
    readonly models: Locator;
    readonly subseries: Locator;
    readonly devices: Locator;
    readonly variants: Locator;
    readonly screenSizes: Locator;
    readonly caseTypes: Locator;
    readonly storages: Locator;
    readonly colors: Locator;
    readonly purchasedFrom: Locator;
    readonly deviceConditions: Locator;
    readonly imeiInput: Locator;
    readonly imeiResultItems: Locator;
    readonly termsAndConditions: Locator;
    readonly summary: Locator;
    readonly nextBtn: Locator;

    constructor(readonly page: Page) {
        this.modal = this.page.locator(`
            .trade-in-popup,
            .trade-in-popup-v3,
            .trade-in-popup-v4,
            [class^='trade-in-steps'],
            .standalone-trade-in-popup__container
        `).filter({ visible: true }).first();

        this.title = this.modal.locator('[class$="_title"]:visible, .modal__title, .standalone-trade-in-popup__headline');
        this.body = this.modal.locator('.modal__body');
        this.xButton = this.modal.locator('[class$="_close"], .modal__close');

        this.intro = this.modal.locator(`
            [class$="_intro"],
            [class$="__discount-list"],
            [class$="v4__tradeIn-note"],
            [class$="__tradeIn-note"]
        `).filter({ visible: true });
        this.customer = this.modal.locator('[class$="_customer"]');
        this.postalCodeInput = this.modal.locator('#tradeInZipCode, [formcontrolname="postCodeControl"], #standaloneTradeinPopupPostCode');
        this.instantDiscount = this.modal.locator('[class$="__option-radio-list"]:has([name="instant-discount"])');
        this.cashbackDiscount = this.modal.locator('[value="cashback"], [data-role-instantdiscount="N"]');
        this.tradeInType = this.modal.locator('.trade-in-types');

        this.categories = this.modal.locator(`
            .deviceType :has(> input),
            #category mat-radio-button,
            mat-radio-button:has(.category-icon)
        `);

        this.brands = this.modal.locator(`
            #brandName li, #brand li, #manufacturer li,
            li.brandName, li.brand, li.manufacturer,
            [formcontrolname="brandFormControl"]:visible,
            .list_form_fields:has-text("ブランド名") + * mat-accordion li,
            .list_form_fields:has-text("Merk") + * mat-accordion li,
            [class*="choose-title"]:has-text("Избери производител") + * li[role="listitem"],
            .js-trade-in-dropbox-brandName .js-dropbox-item
        `).or(this.modal.locator('.trade-in__dropdown-header').filter({
            hasText: /Brand|Manufacturer|Fabricant|Producent|Hersteller|Marque|Marca|Marke|Značka|Bränd|Tuotemerkki|品牌|Gyártó|Gamintojas|Ražotājs|Produsent|Tillverkare|แบรนด์|Nhà sản xuất|Proizvođač|Бренд|Избери производител/i
        }).locator('+ mat-accordion li'));

        this.models = this.modal.locator(`
            #modelName li, #model li, #stockModel li,
            li.modelName, li.model, li.stockModel,
            [formcontrolname="modelFormControl"]:visible,
            [formcontrolname="productFormControl"],
            [class*="choose-title"]:has-text("Избери модел") + * li[role="listitem"],
            .js-trade-in-dropbox-modelName .js-dropbox-item
        `).or(this.modal.locator('.trade-in__dropdown-header').filter({
            hasText: /Model|Modèle|Mudel|モデル名|รุ่น|型號|Модель|Συσκευή|Избери модел/i
        }).locator('+ mat-accordion li'));

        this.subseries = this.modal.locator('#Subseries li, li.Subseries');

        this.devices = this.modal.locator(`
            #device li, #Model li,
            li.device, li.Model:visible
        `).or(this.modal.locator('.trade-in__dropdown-header').filter({
            hasText: /Device|Zařízení|Laite|裝置|Készülék|Įrenginys|Ierīce|Dispositivo|Zariadenia|Thiết bị/i
        }).locator('+ mat-accordion li'));

        this.variants = this.modal.locator('li.Variant');
        this.screenSizes = this.modal.locator('#Screen_Size li, li.Screen.Size');
        this.caseTypes = this.modal.locator('li.Case.Type');
        this.storages = this.modal.locator(`
            #storage li, #Storage li, #capacity li, #memory li,
            li.storage, li.Storage, li.capacity, li.memory,
            [formcontrolname="storageFormControl"]:visible,
            .list_form_fields:has-text("ストレージ") + * mat-accordion li,
            .list_form_fields:has-text("Geheugen") + * mat-accordion li,
            .js-trade-in-dropbox-storage .js-dropbox-item
        `).or(this.modal.locator('.trade-in__dropdown-header, .list_form_fields').filter({
            hasText: /Storage|Stockage|Capacité|Memoria|Capacidad|Speichergrösse|Speichergröße|Kapasitas|儲存容量|ความจุ|Dung lượng|Пам'ять/i
        }).locator('+ mat-accordion li'));

        this.colors = this.modal.locator('#color li, li.color').or(this.modal.locator('.trade-in__dropdown-header').filter({
            hasText: /Color|Couleur|колір/i
        }).locator('+ mat-accordion li'));

        this.purchasedFrom = this.modal.locator(`
            #purchaseChannel li,
            li.purchaseChannel
        `).or(this.modal.locator('.trade-in__dropdown-header').filter({
            hasText: /Purchased from|購買地點/i
        }).locator('+ mat-accordion li'));

        this.deviceConditions = this.modal.locator(`
            ul[class*="summary-accept-list"],
            li[class*="condition-list-item"]:not(.is-disabled),
            .trade-in-question-button-container,
            .condition-button-container,
            .condition-radio,
            .question-entry
        `).filter({ visible: true });

        this.imeiInput = this.modal.locator(`
            [type="text"][id*="imei"i], [type="text"][name*="imei"],
            [type="text"][id*="serie"], [type="text"][name*="serie"],
            [placeholder*="IMEI"i],
            [type="text"][class*="imei"i],
            mat-form-field[class*="imei"] input
        `).filter({visible:true}).first();
        this.imeiResultItems = this.modal.locator(`
            [class$="__brand-item"],
            .trade-in-devices__device-list-option,
            .trade-in-devices-radio__button
        `);

        this.termsAndConditions = this.modal.locator(`
            [class*="terms"] :has(> [type="checkbox"]),
            [class*="tnc"] :has(> [type="checkbox"]),
            [formcontrolname="tnc"]
        `).filter({ visible: true });

        this.summary = this.modal.locator('[class$="__summary"], .summary-product-card');

        this.nextBtn = this.modal.locator(`
            [an-la^="trade-in:"][an-la$=":start"],
            [data-an-la^="trade-in:"][data-an-la$=":start"],
            [an-la^="trade-in:"][an-la$=":next"],
            [an-la^="trade-in popup:"][an-la$=":next"],
            [data-an-la^="trade-in:"][data-an-la$=":next"],
            [an-la^="trade-in:"][an-la$=":continue"],
            [an-la^="trade-in popup:"][an-la$=":continue"],
            [data-an-la^="trade-in:"][data-an-la$=":continue"],
            [data-an-la="trade-in:enter imei:add discount"],
            [an-la^="trade-in:"][an-la*="apply"]:not([an-la$=":close"]),
            [data-an-la^="trade-in:"][data-an-la*="apply"]:not([data-an-la$=":close"]),
            button[form="tradeInIdForm"],
            .modal__footer .view-more,
            .modal__footer .primary,
            [class*="__btn-continue"],
            [class*="__btn-apply"]
        `).filter({ visible: true });
    }

    category(name: string): Locator {
        return this.categories.filter({ hasText: name }).first();
    }

    brand(name: string): Locator {
        return this.brands.filter({ hasText: name }).first();
    }

    model(name: string): Locator {
        return this.models.filter({ hasText: name }).first();
    }

    device(name: string): Locator {
        return this.devices.filter({ hasText: name }).first();
    }

    screenSize(name: string): Locator {
        return this.screenSizes.filter({ hasText: name }).first();
    }

    storage(name: string): Locator {
        return this.storages.filter({ hasText: name }).first();
    }

    color(name: string): Locator {
        return this.colors.filter({ hasText: name }).first();
    }

    button(name: string): Locator {
        return this.modal.getByRole('button', { name, exact: true }).last();
    }

    text(name: string): Locator {
        return this.modal.getByText(name, { exact: true }).last();
    }

    async acceptTermsAndConditions() {
        for (const term of await this.termsAndConditions.all()) {
            await term.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(noop);
            await term.locator('[type="checkbox"]').check({ force: true });
        }
    }

    async process(tradeInData?: TradeInData) {
        const context = this.page.context();
        const data = { ...context.profile.tradeIn, ...tradeInData };
        for (let tries = 1; tries <= 3; tries++) {
            try {
                if (await this.modal.isHidden()) break;

                await this.nextBtn.waitFor({ timeout: 10000 });
                // AU, IT
                if (await this.customer.isVisible()) {
                    await this.customer.locator('label').first().click();
                }
                // PL
                if (await this.instantDiscount.isVisible()) {
                    await this.instantDiscount.locator('label').first().click();
                }
                // IT, CZ
                if (await this.tradeInType.isVisible()) {
                    switch (data.type) {
                        case 'instant':
                            await this.modal.locator('[value="instantDiscount"], [data-role-instantdiscount="Y"]').first().click({ force: true, position: { x: 8, y: 8 } });
                            break;
                        case 'cashback':
                            await this.cashbackDiscount.first().click({ force: true, position: { x: 8, y: 8 } });
                            break;
                        default:
                            await this.tradeInType.locator('[class$="button"]:not(:has(input)), [type="radio"]').first().click();
                            break;
                    }
                }
                // NZ
                if (await this.modal.locator('.trade-in-popup__discount-list').isVisible()) {
                    await this.nextBtn.click();
                }
                if (await this.postalCodeInput.isVisible()) {
                    await this.postalCodeInput.fill(data.postalCode!);
                    await this.postalCodeInput.press('Enter');
                }
                const deviceOptions = this.modal.locator('.trade-in-select__options:visible, .trade-in__dropdown-list:visible');
                if (await this.categories.first().isVisible()) {
                    const category = data.category ? this.category(data.category) : this.categories.first();
                    if (!await category.evaluate(e => e.className.includes('checked') || e.querySelector('input:checked'))) {
                        await category.click();
                        await deviceOptions.waitFor({ timeout: 3000 }).catch(noop);
                    }
                }
                const selectListItem = async (locator: Locator, data?: string) => {
                    if (await locator.first().getAttribute('formcontrolname')) {
                        await locator.first().click({ force: true });
                        const option = data ? this.modal.locator('mat-option:visible, mat-accordion li:visible').filter({ hasText: data }).first() : this.page.locator('mat-option:visible, mat-accordion li:visible').first();
                        await option.click({ timeout: 5000 });
                        await option.waitFor({ state: 'hidden', timeout: 5000 });
                        await this.page.waitForTimeout(1000);
                        return;
                    }
                    const option = data ? locator.filter({ hasText: data }).first() : locator.first();
                    await option.click({ timeout: 5000 });
                    await option.waitFor({ state: 'hidden', timeout: 5000 });
                    await deviceOptions.waitFor({ timeout: 3000 }).catch(noop);
                }
                if (await this.brands.first().isVisible()) {
                    await selectListItem(this.brands, data.brand);
                }
                if (await this.models.first().isVisible()) {
                    await selectListItem(this.models, data.model);
                }
                if (await this.subseries.first().isVisible()) {
                    await selectListItem(this.subseries, data.subseries);
                }
                if (await this.devices.first().isVisible()) {
                    await selectListItem(this.devices, data.device);
                }
                if (await this.variants.first().isVisible()) {
                    await selectListItem(this.variants, data.variant);
                }
                if (await this.screenSizes.first().isVisible()) {
                    await selectListItem(this.screenSizes, data.screenSize);
                }
                if (await this.caseTypes.first().isVisible()) {
                    await selectListItem(this.caseTypes, data.caseType);
                }
                if (await this.storages.first().isVisible()) {
                    await selectListItem(this.storages, data.storage);
                }
                if (await this.colors.first().isVisible()) {
                    await selectListItem(this.colors, data.color);
                }
                if (await this.purchasedFrom.first().isVisible()) {
                    await selectListItem(this.purchasedFrom);
                }
                let { deviceConditions } = data;
                // NZ
                if(context.site === 'NZ' && !await this.deviceConditions.first().isVisible()) {
                    await this.page.waitForTimeout(5000);
                }
                for (const condition of await this.deviceConditions.all()) {
                    const options = condition.locator(':has(> input), button[value], .condition-item-button');
                    if (deviceConditions === 'last') {
                        await options.last().click();
                    } else {
                        await options.first().click();
                        if (deviceConditions?.includes('then-skip')) break;
                        if (deviceConditions?.includes('then-last')) deviceConditions = 'last';
                    }
                }
                if (await this.modal.locator('mat-spinner').isVisible()) {
                    await this.modal.locator('mat-spinner').waitFor({ state: 'hidden', timeout: 15000 }).catch(noop);
                }
                if (await this.imeiInput.isVisible()) {
                    if (['BG', 'CA', 'CA_FR', 'DE', 'HK', 'HK_EN', 'IT', 'JP', 'MY', 'RO', 'UK', 'NL'].includes(this.page.context().site)) {
                        const imei = data.imei || await randomIMEI(this.page.context(), data.brand!, data.model || data.device);
                        await this.imeiInput.fill(imei);
                    } else {
                        await this.imeiInput.fill(data.imei || generateIMEI());
                    }
                    await this.imeiInput.press('Enter');
                    const loading = this.modal.locator('.circular-progress:visible, mat-spinner:visible').first();
                    await loading.waitFor({ timeout: 5000 }).catch(noop);
                    await loading.waitFor({ state: 'hidden', timeout: 15000 }).catch(noop);
                    if (await this.imeiResultItems.count()) {
                        await this.imeiResultItems.first().click();
                    }
                }
                await this.acceptTermsAndConditions();

                await expect(this.nextBtn).not.toHaveAttribute('disabled');
                const btn = await this.nextBtn.elementHandle({ timeout: 5000 });
                await btn!.click({ force: true });
                await btn!.waitForElementState('hidden', { timeout: 10000 }).catch((e) => {
                    if (e.message?.includes('not attached to the DOM')) return;
                    throw new Error('Unable to process to next step');
                });

                await this.page.waitForTimeout(2000);
                tries = 0;
            } catch (error) {
                if (tries == 3) throw error;
            }
        }
    }
}
