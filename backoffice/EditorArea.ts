import type { Page, Locator } from 'playwright';
import Backoffice from './Backoffice';
import Attribute from './Attribute';

type EditorTab =
    'Additional Info' |
    'Addresses' |
    'Administration' |
    'Approvals' |
    'Attributes' |
    'Cart Restrictions' |
    'Category System' |
    'Conditions & Actions' |
    'Configurations' |
    'Consignments' |
    'Delivery Costs' |
    'Employee Prices' |
    'Extended' |
    'F&F Configurations' |
    'General' |
    'Multimedia' |
    'Orders' |
    'Password' |
    'Payment and Delivery' |
    'Payment Provider Parameters' |
    'Personalization' |
    'Pre-order Settings' |
    'Prices' |
    'Properties' |
    'Retirees' |
    'Reviews' |
    'Rule Properties' |
    'Shop App' |
    'Stock' |
    'Variants' |
    string;

class Groupbox extends Attribute {
    constructor(readonly area: Locator, label: string) {
        super(area, label);
        this.cell = area.locator(`[class*="groupbox-ed"]:has([class*="groupbox-ed-label"]:text-is("${label}"))`);
    }
}

export default class EditorArea {
    private page: Page;

    readonly collapseBtn: Locator;
    readonly deleteBtn: Locator;
    readonly refreshBtn: Locator;
    readonly runCronjobBtn: Locator;
    readonly searchByType: Locator;
    readonly saveBtn: Locator;

    constructor(readonly app: Backoffice, readonly area: Locator) {
        this.page = app.page;

        this.collapseBtn = area.locator('.yw-expandCollapse[title="Collapse"]');
        this.deleteBtn = this.area.getByTitle('Delete', { exact: true });
        this.refreshBtn = this.area.getByRole('button', { name: 'Refresh', exact: true });
        this.runCronjobBtn = this.area.getByTitle('Run CronJob', { exact: true });
        this.searchByType = this.area.getByRole('button', { name: '' });
        this.saveBtn = this.area.locator('.y-btn-primary.z-button');
    }

    attribute(label: string): Attribute {
        return new Attribute(this.area, label);
    }

    groupbox(label: string): Attribute {
        return new Groupbox(this.area, label);
    }

    button(name: string): Locator {
        return this.area.getByRole('button', { name, exact: true });
    }

    text(text: string): Locator {
        return this.area.getByText(text, { exact: true });
    }

    async switchToTab(tab: EditorTab) {
        await this.area.getByRole('tab', { name: tab, exact: true }).click();
        await this.page.waitForTimeout(3000);
        await this.app.waitForLoading();
        console.log(`Switched to ${tab} tab`);
    }

    async refresh() {
        await this.refreshBtn.click();
        await this.app.waitForLoading();
    }
}
