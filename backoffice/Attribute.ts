import type { Page, Locator } from 'playwright';

export default class Attribute {
    readonly page: Page;
    public cell: Locator;

    constructor(readonly area: Locator, label: string) {
        this.page = area.page();
        this.cell = area.locator(`[class*="attrcell"]:has([class*="attrcell-label"]:text-is("${label}")):visible`);
    }

    button(name: string): Locator {
        return this.cell.getByRole('button', { name, exact: true });
    }

    locator(selector: string, options?: LocatorOptions): Locator {
        return this.cell.locator(selector, options);
    }

    radio(label: string): Locator {
        return this.cell.locator('.z-radio').filter({ hasText: label });
    }

    row(text: string): Locator {
        return this.cell.getByRole('row', { name: text });
    }

    text(text: string): Locator {
        return this.cell.getByText(text);
    }

    title(text: string): Locator {
        return this.cell.getByTitle(text);
    }

    async getValue() {
        return this.cell.getByRole('textbox').inputValue();
    }

    async setValue(value: number | string) {
        await this.cell.getByRole('textbox').fill(value.toString());
    }

    async selectCombobox(option: string, exact?: boolean) {
        await this.cell.getByLabel('Expand').click();
        await this.page.waitForTimeout(2000);
        const opt = this.page.getByRole('listitem').filter({ hasText: exact ? new RegExp(`^${option}$`) : option });
        await opt.first().click();
    }
}
