import type { Locator, Page } from 'playwright';

export interface FormField extends Locator {
    readonly label: Locator;
    readonly errorMessage: Locator;
    readonly clearBtn: Locator;
    readonly select: (option: string | number) => Promise<void>;
    readonly leaveBlank: () => Promise<void>;
}

export interface Checkbox extends Locator {
    readonly label: Locator;
}

export interface Radio extends Locator {
    readonly label: Locator;
}

export default class Form {
    readonly page: Page;
    readonly fields: FormField;
    readonly invalidFields: FormField;

    constructor(readonly form: Locator) {
        this.page = form.page();
        this.fields = Form.field(this.form.locator('mat-form-field:visible'));
        this.invalidFields = Form.field(this.form.locator('.mat-form-field-invalid:visible'));
    }

    static isReadOnly(locator: Locator): Promise<boolean> {
        return locator.evaluate((e: any) =>
            e.disabled || e.readOnly || (e.ariaDisabled == 'true') || (getComputedStyle(e).cursor == 'not-allowed')
        );
    }

    static isRequired(locator: Locator): Promise<boolean> {
        return locator.evaluate((e: any) =>
            e.required || e.ariaRequired == 'true'
        );
    }

    static async selectCombobox(combobox: Locator, option: string | number): Promise<void> {
        try {
            await combobox.click({ force: true, timeout: 10000 });
            const opt = typeof option === 'number'
                ? combobox.page().getByRole('option').nth(option - 1)
                : combobox.page().getByRole('option', { name: option }).first();
            await opt.waitFor({ state: 'visible', timeout: 5000 });
            await opt.click({ timeout: 10000 }).catch(() => { });
            await opt.waitFor({ state: 'hidden', timeout: 10000 });
            await new Promise(r => setTimeout(r, 1000));
        } catch {
            const name = await combobox.getAttribute('name');
            throw new Error(`unable to select option ${option} for ${name || combobox}`);
        }
    }

    static checkbox(locator: Locator): Checkbox {
        const cbx = locator.getByRole('checkbox');
        const { click, check, uncheck } = cbx;
        return Object.assign(cbx, {
            label: locator.locator('label'),
            click: (options?: any) => click.bind(cbx)({ ...options, force: true }),
            check: (options?: any) => check.bind(cbx)({ ...options, force: true }),
            uncheck: (options?: any) => uncheck.bind(cbx)({ ...options, force: true }),
        });
    }

    static radio(locator: Locator): Radio {
        const radio = locator.getByRole('radio');
        const { click } = radio;
        return Object.assign(radio, {
            label: locator.locator('label'),
            click: (options?: any) => click.bind(radio)({ ...options, force: true }),
        });
    }

    static field(locator: Locator): FormField {
        const fieldControl = locator.locator('input, textarea, mat-select');
        return Object.assign(fieldControl, {
            label: locator.locator('label'),
            errorMessage: locator.locator('mat-error:visible'),
            // ID renders the clear icon as mat-icon[svgicon="cancel"] instead of .clear-btn
            clearBtn: locator.locator('.clear-btn, mat-icon[svgicon="cancel"]'),
            async fill(value: string) {
                try {
                    await locator.locator('input, textarea').fill(value);
                } catch {
                    throw new Error(`unable to fill value ${value} for ${locator}`);
                }
            },
            async select(option: string | number) {
                await Form.selectCombobox(locator.getByRole('combobox'), option);
            },
            async leaveBlank() {
                if (await fieldControl.evaluate(e => e.tagName == 'INPUT')) {
                    await fieldControl.clear();
                    await fieldControl.blur();
                } else {
                    await fieldControl.click({ force: true });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await fieldControl.click({ force: true, position: { x: -24, y: 0 } });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        });
    }

    static async getValues(form: Form): Promise<string[]> {
        return await form.fields.evaluateAll(elms => elms.map((elm: any) =>
            elm.querySelector('.mat-mdc-select-value-text')?.innerText ||
            elm.value
        ));
    }

    checkbox(...names: string[]): Checkbox {
        const locator = this.form.locator(names.map(name => `
            mat-checkbox[formcontrolname="${name}"]:visible,
            mat-checkbox:has([name="${name}"]):visible
        `).join(', '));
        return Form.checkbox(locator);
    }

    radio(...values: string[]): Radio {
        const locator = this.form.locator(values.map(value => `
            mat-radio-button[value="${value}"]:visible,
            mat-radio-button:has([value="${value}"]):visible
        `).join(', '));
        return Form.radio(locator);
    }

    field(...names: string[]) {
        const locator = this.form.locator(names.map(name => `
            mat-form-field:has([formcontrolname="${name}"]):visible,
            mat-form-field[formcontrolname="${name}"]:visible,
            mat-form-field:has([name="${name}"]):visible,
            mat-form-field:has([type="${name}"]):visible
        `).join(', '));
        return Form.field(locator);
    }

    async leaveAllEmpty() {
        for (const field of await this.form.getByRole('textbox').all()) {
            if (await Form.isReadOnly(field)) continue;
            await field.clear();
            await field.blur();
        }
        for (const field of await this.form.getByRole('combobox').all()) {
            await field.click({ force: true });
            await this.page.waitForTimeout(1000);
            await field.click({ force: true, position: { x: -24, y: 0 } });
            await this.page.waitForTimeout(2000);
        }
    }

    async fill(data: Record<string, any>) {
        for (const [name, value] of Object.entries(data)) {
            const field = this.field(name);
            if (await Form.isReadOnly(field)) continue;
            if (await field.getAttribute('role') === 'combobox') {
                await field.select(value);
            } else {
                await field.fill(value);
                await field.blur();
            }
        }
    }
}
