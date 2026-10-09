import { expect, Locator } from 'playwright/test';
import Form, { FormField } from './Form';

export default class Address extends Form {
    // Address search UI, shared by shipping & billing (PT uses an autocomplete search field)
    readonly searchField: FormField;
    readonly searchIcon: Locator;
    readonly suggestions: Locator;

    constructor(form: Locator) {
        super(form);
        this.searchField = this.field('searchAddress');
        this.searchIcon = form.locator('mat-form-field:has([name="searchAddress"]) mat-icon, mat-form-field:has([name="searchAddress"]) [class*="icon"]').first();
        this.suggestions = this.page.locator('mat-option:visible');
    }

    private async selectFirstResult() {
        const options = this.suggestions;
        for (let tries = 1; tries <= 2; tries++) {
            if (await options.count()) {
                await options.first().click({ timeout: 5000 });
                await expect(options.first()).toBeHidden();
                await this.page.waitForTimeout(1000);
            }
        }
    }

    async autoFill(data: Record<string, any>) {
        const locator = this.form.getByRole('textbox').or(this.form.getByRole('combobox'));
        let skip = 0;
        for (let tries = 1; tries <= 3; tries++) {
            try {
                const fields = await locator.all();
                for (const field of fields.slice(skip)) {
                    if (await Form.isReadOnly(field)) { skip++; continue }
                    const name = await field.getAttribute('name') || await field.getAttribute('formcontrolname') as string;
                    if (!await Form.isRequired(field)) { skip++; continue }
                    if (!data[name]) { skip++; continue }
                    if (await field.getAttribute('role') === 'combobox') {
                        if (await field.evaluate(e => e.tagName == 'INPUT')) {
                            await field.fill(data[name], { timeout: 5000 });
                            await this.page.waitForTimeout(1000);
                            await this.form.locator('mat-spinner:visible').waitFor({ state: 'hidden' });
                        }
                        if (name == 'line1') {
                            await field.click({ timeout: 10000 });
                            await this.selectFirstResult();
                        } else {
                            await Form.selectCombobox(field, data[name]);
                        }
                        console.log(`[Address] ${name} selected: ${data[name]}`);
                    } else {
                        await field.fill(data[name], { timeout: 5000 });
                        if (await field.evaluate(e => e.closest('mat-form-field')?.className.includes('search'))) {
                            await this.page.waitForTimeout(1000);
                            await this.form.locator('mat-spinner:visible').waitFor({ state: 'hidden' });
                            await this.selectFirstResult();
                        } else {
                            await field.evaluate(e => e.dispatchEvent(new Event('keyup', { bubbles: true })));
                            await field.click({ force: true, position: { x: 0, y: -12 } });
                        }
                        if (name == 'postalCode') await this.page.waitForTimeout(1000);
                        console.log(`Field ${name} filled: ${data[name]}`);
                    }
                    skip++;
                }
                if (await locator.count() > fields.length) continue;
                break;
            } catch (error) {
                if (tries == 3) throw error;
            }
        }
        await this.form.click({ force: true, position: { x: 0, y: 0 } });
    }

    async fill(data: Record<string, string | number>) {
        for (const [name, value] of Object.entries(data) as any) {
            const field = this.field(name);
            if (await field.getAttribute('role') === 'combobox') {
                await field.select(value);
            } else {
                await field.fill(value);
                await field.blur();
            }
            console.log(`Field ${name} filled: ${value}`);
        }
    }
}
