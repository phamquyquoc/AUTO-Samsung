import HAC from './hac';
import { Collection, HACModel, assertSafe } from './collection';

type CatalogVersion = 'Online' | 'Staged';

export type Product = {
    pk: string;
    sku: string;
    name: string;
    catalog: string;
    catalogVersion: string;
    disclaimerText: string;
    externalProductUrl: string;
}

export class ProductCollection extends Collection<Product> {
    protected buildQuery(filters: Record<string, any>) {
        let fields: string[] = [
            '{p.pk} AS pk',
            '{p.code} AS sku',
            '{p.name} AS name',
            '{c.name} AS catalog',
            '{cv.version} AS catalogVersion',
            '{as.code} AS approvalStatus',
            'p_disclaimertext AS disclaimerText',
            '{p.externalproducturl} AS externalProductUrl',
            '{ss.code} AS salesStatus',
        ];
        let from = `
            Product AS p
            JOIN CatalogVersion AS cv ON {p.catalogVersion} = {cv.pk}
            JOIN Catalog AS c ON {cv.catalog} = {c.pk}
            JOIN EnumerationValue AS as ON {p.approvalStatus} = {as.pk}
            JOIN EnumerationValue AS ss ON p_salesstatus = {ss.pk}
        `;
        let whereArr: string[] = [];
        for (const [key, value] of Object.entries(filters)) {
            switch (key) {
                case 'catalog':
                    whereArr.push(`{c.name} = '${value}'`);
                    break;
                case 'catalogVersion':
                    whereArr.push(`{cv.version} = '${value}'`);
                    break;
                default:
                    whereArr.push(this.condition('p', key, value));
            }
        }
        const query = `SELECT ${fields.join(', ')} FROM {${from}} ${whereArr.length > 0 ? `WHERE ${whereArr.join(' AND ')}` : ''}`;
        return query;
    }

    protected toModel(hac: HAC, data: Product) {
        return new ProductModel(hac, data);
    }

    async getBySKU(sku: string, catalog: string, catalogVersion: CatalogVersion = 'Online') {
        return this.findOne({ code: sku, catalog, catalogVersion });
    }

    /**
     * What BO shows as Product > Category System > Add Available service is an AVAILABLE_SERVICE
     * ProductReference from the product to the service base product, both in the Online catalog.
     *
     * `body` runs with `main`, `service` and `existing` (the AVAILABLE_SERVICE references already
     * between the two) in scope, and returns the JSON result.
     */
    private availableServiceScript(sku: string, serviceSKU: string, catalog: string, body: string) {
        assertSafe(sku, 'SKU');
        assertSafe(serviceSKU, 'service SKU');
        assertSafe(catalog, 'catalog');
        return `
            import groovy.json.JsonOutput
            import de.hybris.platform.servicelayer.search.FlexibleSearchQuery

            def find = { String code ->
                def q = new FlexibleSearchQuery("SELECT {p.pk} FROM {Product AS p " +
                    "JOIN CatalogVersion AS cv ON {p.catalogVersion}={cv.pk} " +
                    "JOIN Catalog AS c ON {cv.catalog}={c.pk}} " +
                    "WHERE {p.code}=?code AND {c.id}='${catalog}' AND {cv.version}='Online'")
                q.addQueryParameter('code', code)
                q.count = 5
                def hit = flexibleSearchService.search(q).result[0]
                if (!hit) throw new IllegalStateException("No ${catalog} Online product for " + code)
                hit
            }

            def main = find('${sku}')
            def service = find('${serviceSKU}')

            def q = new FlexibleSearchQuery("SELECT {pk} FROM {ProductReference} WHERE {source}=?src AND {target}=?tgt")
            q.addQueryParameter('src', main)
            q.addQueryParameter('tgt', service)
            q.count = 50
            def existing = flexibleSearchService.search(q).result
                .findAll { it.referenceType?.code == 'AVAILABLE_SERVICE' }

            ${body}
        `;
    }

    /** Attaches the service if it is not attached already, so a stray run costs nothing. */
    async addAvailableService(sku: string, serviceSKU: string, catalog: string): Promise<AvailableServiceResult> {
        const result = await this.hac.executeGroovy(this.availableServiceScript(sku, serviceSKU, catalog, `
            if (existing) return JsonOutput.toJson([action: 'already attached', count: existing.size()])

            def ref = modelService.create('ProductReference')
            ref.source = main
            ref.target = service
            ref.referenceType = enumerationService.getEnumerationValue('ProductReferenceTypeEnum', 'AVAILABLE_SERVICE')
            ref.active = true
            ref.preselected = false
            modelService.save(ref)
            return JsonOutput.toJson([action: 'attached', count: 1])
        `));
        return JSON.parse(result);
    }

    async removeAvailableService(sku: string, serviceSKU: string, catalog: string): Promise<AvailableServiceResult> {
        const result = await this.hac.executeGroovy(this.availableServiceScript(sku, serviceSKU, catalog, `
            existing.each { modelService.remove(it) }
            return JsonOutput.toJson([action: 'removed', count: existing.size()])
        `));
        return JSON.parse(result);
    }
}

export type AvailableServiceResult = {
    action: 'attached' | 'already attached' | 'removed';
    count: number;
};

export class ProductModel extends HACModel<Product> {
    async save() {
        console.log(this._update);
        Reflect.set(this, '_update', {});
    }
}
