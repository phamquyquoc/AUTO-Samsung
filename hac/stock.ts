import HAC from './hac';
import { assertSafe, quote } from './collection';

export type StockLevel = {
    pk: string;
    sku: string;
    warehouse: string;
    available: number;
    reserved: number;
};

/** What `ensureAvailable` raised, in the shape `restore` takes back. */
export type StockRestore = {
    pk: string;
    available: number;
};

/**
 * StockLevel rows through the Groovy console.
 *
 * `flexibleSearch()` pins the DataLocale to `tr_TR`, which only TR carries, so this goes through
 * `executeGroovy` the same way `searchColumn` does.
 *
 * A SKU has one row per warehouse, and **which warehouse decides whether the cart will take it is
 * per site** - find it before writing. On CA it is `VirtualWarehouse-ca`: raising `S311` to 50 moved
 * SIMPLE_INFO to `inStock` while the cart still answered "cannot be shipped - out of stock online",
 * and only `VirtualWarehouse-ca` made it add. `S311` is also resynced from outside and drops back on
 * its own. PH records its own code per product (`warehouse` in `stg2_products.json`).
 *
 * So `stockLevelStatus` is not the check - `api.addToCart(sku)` is. It is the gate a spec actually
 * hits, and its error names the reason.
 */
export class StockCollection {
    constructor(private readonly hac: HAC) { }

    private where(skus: string[], warehouse?: string) {
        const conditions = [`{sl.productCode} IN (${skus.map(s => quote(s, 'SKU')).join(',')})`];
        if (warehouse) conditions.push(`{w.code} = ${quote(warehouse, 'warehouse code')}`);
        return conditions.join(' AND ');
    }

    private query(skus: string[], warehouse?: string) {
        return `SELECT {sl.pk} FROM {StockLevel AS sl JOIN Warehouse AS w ON {sl.warehouse}={w.pk}}`
            + ` WHERE ${this.where(skus, warehouse)}`;
    }

    /** Every StockLevel row for the given SKUs, newest first is not guaranteed - filter by warehouse. */
    async find(skus: string[], warehouse?: string): Promise<StockLevel[]> {
        const result = await this.hac.executeGroovy(`
            import groovy.json.JsonOutput
            import de.hybris.platform.servicelayer.search.FlexibleSearchQuery
            def q = new FlexibleSearchQuery("${this.query(skus, warehouse)}")
            return JsonOutput.toJson(flexibleSearchService.search(q).result.collect{[
                pk: it.pk.toString(),
                sku: it.productCode,
                warehouse: it.warehouse?.code,
                available: it.available,
                reserved: it.reserved,
            ]})
        `, false);
        return JSON.parse(result);
    }

    /**
     * Sets `available` on one warehouse's rows and leaves `reserved` alone. Writes to the
     * environment - returns what each row held before and after so the change can be undone.
     *
     * This confirms the database only. Check the change took with `api.addToCart(sku)`.
     */
    async setAvailable(skus: string[], warehouse: string, available: number): Promise<(StockLevel & { before: number })[]> {
        if (!Number.isInteger(available) || available < 0) {
            throw new Error(`[HAC] available must be a non-negative integer, got ${available}`);
        }
        const result = await this.hac.executeGroovy(`
            import groovy.json.JsonOutput
            import de.hybris.platform.servicelayer.search.FlexibleSearchQuery
            def q = new FlexibleSearchQuery("${this.query(skus, warehouse)}")
            def log = []
            flexibleSearchService.search(q).result.each {
                def before = it.available
                it.setAvailable(${available})
                modelService.save(it)
                modelService.refresh(it)
                log << [
                    pk: it.pk.toString(),
                    sku: it.productCode,
                    warehouse: it.warehouse?.code,
                    before: before,
                    available: it.available,
                    reserved: it.reserved,
                ]
            }
            return JsonOutput.toJson(log)
        `, true);
        const rows = JSON.parse(result);
        console.log(`[HAC] ${warehouse} stock set to ${available}:`, JSON.stringify(rows));
        return rows;
    }

    /**
     * Raises `available` only for the SKUs that have fewer than `minimum` unreserved units, and
     * returns what `restore` needs to put back. Nothing to raise means an empty snapshot.
     */
    async ensureAvailable(skus: string[], warehouse: string, minimum = 2): Promise<StockRestore[]> {
        const rows = await this.find(skus, warehouse);
        const snapshot: StockRestore[] = [];
        for (const sku of skus) {
            const row = rows.find(r => r.sku === sku);
            if (!row) throw new Error(`[HAC] [NO DATA] No ${warehouse} stock row for ${sku}`);
            if (row.available - row.reserved >= minimum) continue;
            const [updated] = await this.setAvailable([sku], warehouse, Math.max(100, row.reserved + 10));
            snapshot.push({ pk: updated.pk, available: updated.before });
        }
        return snapshot;
    }

    /** Puts back what `ensureAvailable` raised. `reserved` is left alone, as it was on the way in. */
    async restore(snapshot: StockRestore[]) {
        for (const row of snapshot) {
            assertSafe(row.pk, 'stock PK');
            if (!Number.isInteger(row.available)) throw new Error(`[HAC] Invalid stock value: ${row.available}`);
        }
        if (!snapshot.length) return;

        await this.hac.executeGroovy(`
            import de.hybris.platform.core.PK
            import groovy.json.JsonSlurper

            def rows = new JsonSlurper().parseText('''${JSON.stringify(snapshot)}''')
            rows.each { saved ->
                def stock = modelService.get(PK.fromLong(Long.parseLong(saved.pk)))
                stock.setAvailable(saved.available as int)
                modelService.save(stock)
            }
            return "restored"
        `, true);
    }
}
