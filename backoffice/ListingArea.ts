import assert from 'assert';
import type { Page, Locator } from 'playwright';
import Backoffice from './Backoffice';

const noop = () => { };

export default class ListingArea {
    private page: Page;

    readonly expandCollapseBtn: Locator;
    readonly collapseBtn: Locator;
    readonly switchSearchBtn: Locator;
    readonly searchInput: Locator;
    readonly advancedSearchArea: Locator;
    readonly addFilterRow: Locator;
    readonly addFilterAttribute: Locator;
    readonly addFilterComparator: Locator;
    readonly addFilterValue: Locator;
    readonly addFilterBtn: Locator;
    readonly removeFilterBtn: Locator;
    readonly searchBtn: Locator;
    readonly collBrowser: Locator;
    readonly rows: Locator;
    readonly nextPageBtn: Locator;

    constructor(readonly app: Backoffice, readonly area: Locator) {
        this.page = app.page;
        this.expandCollapseBtn = area.locator('.yw-expandCollapse[title="Expand"]');
        this.collapseBtn = area.locator('.yw-expandCollapse[title="Collapse"]');
        this.switchSearchBtn = this.area.locator('.yw-toggle-advanced-search');
        this.searchInput = this.area.getByRole('textbox', { name: 'Type to search' });
        this.advancedSearchArea = this.area.locator('.yw-active-attributes-grid-container:visible');
        this.addFilterRow = this.area.locator('.yw-add-field-row').last();
        this.addFilterAttribute = this.addFilterRow.locator('.yw-additional-attributes-selector').first();
        this.addFilterComparator = this.addFilterRow.locator('.yw-advancedsearch-operator').first();
        this.addFilterValue = this.addFilterRow.locator('> td').nth(2).locator(this.page.getByRole('combobox').or(this.page.getByRole('textbox'))).first();
        this.addFilterBtn = this.addFilterRow.getByTitle('Add Attribute Filter');
        this.removeFilterBtn = this.area.locator('.yw-advancedsearch-delete-btn');
        this.searchBtn = this.area.locator('.yw-textsearch-searchbutton:visible');
        this.collBrowser = this.area.locator('.yw-coll-browser-container').getByRole('grid');
        this.rows = this.collBrowser.getByRole('row');
        this.nextPageBtn = this.area.getByRole('button', { name: 'Next' });
    }

    async basicSearch(value: string) {
        if (await this.advancedSearchArea.isVisible()) {
            await this.switchSearchBtn.click();
            await this.advancedSearchArea.waitFor({ state: 'hidden' });
        }
        await this.searchInput.fill(value);
        const oldResults = await this.collBrowser.elementHandle();
        await this.searchBtn.click();
        console.log('Search button clicked');
        await oldResults!.waitForElementState('hidden');
        console.log('Search results updated');
    }

    async addFilter(attribute: string, comparator: string, value: string) {
        try {
            console.log(`Adding filter: ${attribute} ${comparator} ${value}`);
            const attrText = new RegExp(`^\\s*${attribute.replace(' ', '[\\s\\u00A0]+')}\\s*$`);
            await this.addFilterAttribute.click();
            await this.page.getByRole('listitem').filter({ hasText: attrText }).click();
            await this.page.waitForTimeout(2000);
            await this.addFilterComparator.click();
            await this.page.getByRole('listitem').filter({ hasText: comparator }).click();
            await this.page.waitForTimeout(2000);
            const classList = await this.addFilterValue.evaluate(e => Array.from(e.classList));
            if (classList.includes('z-bandbox')) {
                return;
            } else if (classList.includes('z-combobox')) {
                return;
            } else {
                await this.addFilterValue.fill(value);
            }
            await this.page.waitForTimeout(2000);
            const btn = await this.addFilterBtn.elementHandle();
            await this.addFilterBtn.click();
            await this.page.waitForTimeout(2000);
            await btn!.waitForElementState('hidden').catch(noop);
        } catch (cause) {
            throw new Error(`Unable to add filter: ${attribute} ${comparator} ${value}`, { cause });
        }
    }

    async removeAllFilters() {
        try {
            const count = await this.removeFilterBtn.count();
            for (let i = 0; i < count; i++) {
                await this.removeFilterBtn.first().click();
                await this.page.waitForTimeout(2000);
            }
        } catch (cause) {
            throw new Error('Unable to remove all existing filters', { cause });
        }
    }

    async advancedSearch(...filters: { attribute: string; comparator: string; value: string }[]) {
        try {
            console.log('Performing advanced search');
            if (await this.advancedSearchArea.isHidden()) {
                await this.switchSearchBtn.click();
                await this.advancedSearchArea.waitFor({ state: 'visible' });
            }
            await this.removeAllFilters();
            for (const f of filters) {
                await this.addFilter(f.attribute, f.comparator, f.value);
            }
            const oldResults = await this.collBrowser.elementHandle();
            await this.searchBtn.click();
            console.log('Search button clicked');
            await oldResults!.waitForElementState('hidden').catch(noop);
            await this.page.waitForTimeout(2000);
            console.log('Search results updated');
        } catch (cause) {
            throw new Error('Failed to perform advanced search with filters: ' + filters.map(f => `${f.attribute} ${f.comparator} ${f.value}`).join(', '), { cause });
        }
    }

    row(header: string, value: string, ...otherFilters: string[]): Locator {
        assert(otherFilters.length % 2 == 0);
        let filter = this.page.getByRole('gridcell', { name: header }).getByText(value, { exact: true });
        for (let i = 0; i < otherFilters.length - 1; i += 2) {
            filter = filter.and(this.page.getByRole('gridcell', { name: otherFilters[i] }).getByText(otherFilters[i + 1], { exact: true }));
        }
        return this.rows.filter({ has: filter });
    }

    async findRow(header: string, value: string, ...otherFilters: string[]) {
        while (true) {
            const row = this.row(header, value, ...otherFilters);
            if (await row.first().isVisible()) return row;
            if (await this.nextPageBtn.isVisible()) {
                const oldResults = await this.collBrowser.elementHandle();
                await this.nextPageBtn.click();
                console.log('Next page clicked');
                await this.page.waitForTimeout(2000);
                await oldResults!.waitForElementState('hidden').catch(noop);
                await this.page.waitForTimeout(5000);
                console.log('Search results updated');
            } else {
                throw new Error(`Row with ${header} = "${value}" not found`);
            }
        }
    }

    async selectFirst() {
        await this.rows.nth(1).click();
        await this.page.waitForTimeout(3000);
        await this.app.waitForLoading();
    }

    async select(columnName: string, value: string) {
        try {
            const row = await this.findRow(columnName, value);
            await row.first().click();
            await this.page.waitForTimeout(3000);
            await this.app.waitForLoading();
        } catch (cause) {
            throw new Error(`Unable to select row with ${value}`, { cause });
        }
    }
}
