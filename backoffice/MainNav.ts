import type { Locator, Page } from 'playwright';

export default class MainNav {
    private page: Page;
    readonly tree: Locator;

    constructor(readonly nav: Locator) {
        this.page = nav.page();
        this.tree = nav.getByRole('treegrid');
    }

    async navigate(...paths: string[]) {
        while (!await this.tree.isVisible()) await this.page.waitForTimeout(3000);
        for (let level = 1; level <= paths.length; level++) {
            const name = paths[level - 1];
            const node = this.tree.getByRole('row', { name, level, exact: true }).or(this.tree.getByRole('row', { name: name + ' selected', level, exact: true })).first();
            while (!await node.isVisible()) await this.page.waitForTimeout(3000);
            const isOpen = await node.evaluate(e => e.classList.contains('yw-opened') || e.classList.contains('yw-selected'));
            if (!isOpen || level == paths.length) {
                await node.click();
                await this.page.waitForTimeout(3000);
            }
        }
        console.log(`Navigated to ${paths.join(' > ')}`);
    }

    async openProducts() {
        await this.navigate('Catalog', 'Products');
    }

    async openOrders() {
        await this.navigate('Order', 'Orders');
    }

    async openCronjob() {
        await this.navigate('System', 'Background Processes', 'CronJobs');
    }

    async openBaseStore() {
        await this.navigate('Base Commerce', 'Base Store');
    }

    async openDeliveryCost() {
        await this.navigate('Price Settings', 'Delivery Costs');
    }

    async openTypes() {
        await this.navigate('System', 'Types');
    }
}