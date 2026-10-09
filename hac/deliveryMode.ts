import HAC from './hac';
import { assertSafe } from './collection';

export type DeliveryModeERP = {
    code: string;
    deliveryMode: string;
    shippingCondition: string;
    sProcInd: string;
};

/**
 * A delivery-mode routing precondition, as it is committed in `{env}_products.json`.
 *
 * `deliveryModeAliases` exists because the storefront matches modes by code: the `source` mode
 * takes over the `target`'s code, and the `target` is parked under a temporary code for the run.
 */
export type DeliveryModeRouting = {
    /** Set active and joined to `deliveryModeGroup`. */
    activeDeliveryModes: string[];
    /** Set inactive. */
    inactiveDeliveryModes: string[];
    deliveryModeAliases: Array<{ source: string; target: string }>;
    deliveryModeGroup: string;
    catalog: string;
    version: string;
    /** Weight the SKU is given for the run. The product is left untouched when absent. */
    skuWeight?: number;
};

export type RoutingSnapshot = {
    modes: Array<{ pk: string; code: string; active: boolean; groupUIDs: string[] }>;
    product?: { pk: string; skuWeight: number | null } | null;
};

/**
 * DeliveryMode routing through the Groovy console.
 *
 * `configureRouting` writes to the shared environment - it returns the snapshot that
 * `restoreRouting` takes back, so a spec pairs the two in `try/finally`.
 */
export class DeliveryModeCollection {
    constructor(private readonly hac: HAC) { }

    /** The ERP fields a delivery mode carries. Read-only. */
    async erp(code: string): Promise<DeliveryModeERP[]> {
        assertSafe(code, 'delivery mode code');
        const result = await this.hac.executeGroovy(`
            import groovy.json.JsonOutput
            import de.hybris.platform.servicelayer.search.FlexibleSearchQuery
            def query = new FlexibleSearchQuery("SELECT {pk} FROM {DeliveryMode} WHERE {code} = ?code")
            query.addQueryParameter("code", "${code}")
            def rows = flexibleSearchService.search(query).result.collect { mode -> [
                code: mode.code,
                deliveryMode: mode.gerpDeliveryMode,
                shippingCondition: mode.gerpShippingCondition,
                sProcInd: mode.gerpSProcInd,
            ] }
            return JsonOutput.toJson(rows)
        `, false);
        return JSON.parse(result);
    }

    async configureRouting(sku: string, routing: DeliveryModeRouting): Promise<RoutingSnapshot> {
        for (const code of [...routing.activeDeliveryModes, ...routing.inactiveDeliveryModes]) {
            assertSafe(code, 'delivery mode code');
        }
        for (const alias of routing.deliveryModeAliases) {
            assertSafe(alias.source, 'source delivery mode code');
            assertSafe(alias.target, 'target delivery mode code');
        }
        assertSafe(sku, 'SKU');
        assertSafe(routing.deliveryModeGroup, 'delivery mode group');
        assertSafe(routing.catalog, 'catalog');
        assertSafe(routing.version, 'catalog version');
        if (routing.skuWeight !== undefined && (!Number.isFinite(routing.skuWeight) || routing.skuWeight < 0)) {
            throw new Error(`[HAC] Invalid SKU weight: ${routing.skuWeight}`);
        }

        const targetWeight = routing.skuWeight === undefined ? 'null' : `${routing.skuWeight}d`;
        const result = await this.hac.executeGroovy(`
            import groovy.json.JsonOutput
            import groovy.json.JsonSlurper
            import de.hybris.platform.servicelayer.search.FlexibleSearchQuery

            def activeCodes = ${JSON.stringify(routing.activeDeliveryModes)}
            def inactiveCodes = ${JSON.stringify(routing.inactiveDeliveryModes)}
            def aliases = new JsonSlurper().parseText('''${JSON.stringify(routing.deliveryModeAliases)}''')
            def allCodes = (activeCodes + inactiveCodes + aliases*.target).unique()
            def modeQuery = new FlexibleSearchQuery("SELECT {pk} FROM {DeliveryMode} WHERE {code} IN (?codes)")
            modeQuery.addQueryParameter("codes", allCodes)
            def modes = flexibleSearchService.search(modeQuery).result
            if (modes.size() != allCodes.size()) {
                throw new IllegalStateException("Expected " + allCodes.size() + " delivery modes, found " + modes.size())
            }
            def groupQuery = new FlexibleSearchQuery("SELECT {pk} FROM {DeliveryModeGroup} WHERE {uid}=?uid")
            groupQuery.addQueryParameter("uid", "${routing.deliveryModeGroup}")
            def group = flexibleSearchService.searchUnique(groupQuery)
            def modeSnapshot = modes.collect { mode -> [
                pk: mode.pk.toString(),
                code: mode.code,
                active: mode.active,
                groupUIDs: mode.groups*.uid,
            ] }
            modes.each { mode ->
                mode.setActive(activeCodes.contains(mode.code))
                if (activeCodes.contains(mode.code)) {
                    mode.groups = new java.util.HashSet((mode.groups + group).unique())
                }
                modelService.save(mode)
            }
            aliases.each { alias ->
                def source = modes.find { it.code == alias.source }
                def target = modes.find { it.code == alias.target }
                target.setCode(alias.target + '-hac-parked-' + target.pk.toString())
                modelService.save(target)
                source.setCode(alias.target)
                modelService.save(source)
            }

            def productSnapshot = null
            def targetWeight = ${targetWeight}
            if (targetWeight != null) {
                def productQuery = new FlexibleSearchQuery('''
                    SELECT {p.pk}
                    FROM {Product AS p JOIN CatalogVersion AS cv ON {p.catalogVersion}={cv.pk}
                        JOIN Catalog AS c ON {cv.catalog}={c.pk}}
                    WHERE {p.code}=?sku AND {c.id}=?catalog AND {cv.version}=?version
                ''')
                productQuery.addQueryParameter("sku", "${sku}")
                productQuery.addQueryParameter("catalog", "${routing.catalog}")
                productQuery.addQueryParameter("version", "${routing.version}")
                def product = flexibleSearchService.searchUnique(productQuery)
                productSnapshot = [pk: product.pk.toString(), skuWeight: product.skuWeight]
                product.setSkuWeight(targetWeight)
                modelService.save(product)
            }
            return JsonOutput.toJson([modes: modeSnapshot, product: productSnapshot])
        `, true);
        return JSON.parse(result);
    }

    async restoreRouting(snapshot: RoutingSnapshot) {
        for (const mode of snapshot.modes) {
            assertSafe(mode.pk, 'delivery mode PK');
            assertSafe(mode.code, 'delivery mode code');
            for (const uid of mode.groupUIDs) assertSafe(uid, 'delivery mode group');
        }
        if (snapshot.product) assertSafe(snapshot.product.pk, 'product PK');

        await this.hac.executeGroovy(`
            import de.hybris.platform.core.PK
            import groovy.json.JsonSlurper
            import de.hybris.platform.servicelayer.search.FlexibleSearchQuery

            def modes = new JsonSlurper().parseText('''${JSON.stringify(snapshot.modes)}''')
            def records = modes.collect { saved -> [
                saved: saved,
                mode: modelService.get(PK.fromLong(Long.parseLong(saved.pk))),
            ] }
            records.each { record ->
                record.mode.setCode('hac-restore-' + record.saved.pk)
                modelService.save(record.mode)
            }
            records.each { record ->
                record.mode.setCode(record.saved.code)
                record.mode.setActive(record.saved.active)
                record.mode.groups = new java.util.HashSet(record.saved.groupUIDs.collect { uid ->
                    def groupQuery = new FlexibleSearchQuery("SELECT {pk} FROM {DeliveryModeGroup} WHERE {uid}=?uid")
                    groupQuery.addQueryParameter("uid", uid)
                    return flexibleSearchService.searchUnique(groupQuery)
                })
                modelService.save(record.mode)
            }
            def product = new JsonSlurper().parseText('''${JSON.stringify(snapshot.product ?? null)}''')
            if (product != null) {
                def model = modelService.get(PK.fromLong(Long.parseLong(product.pk)))
                model.setSkuWeight(product.skuWeight == null ? null : product.skuWeight as Double)
                modelService.save(model)
            }
            return "restored"
        `, true);
    }
}
