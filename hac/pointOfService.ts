import HAC from './hac';

export type PointOfService = {
    pk: string;
    name: string;
    addressPk: string;
    line1: string;
    line2: string;
    town: string;
    postalCode: string;
    latitude: number;
    longitude: number;
};

/** PoS codes and Address PKs are digits only, and go into the Groovy string as-is. */
function assertNumeric(value: string, what: string) {
    if (!/^\d+$/.test(value)) throw new Error(`[HAC] Unsafe ${what}: ${value}`);
    return value;
}

/**
 * Pickup points and the Address each one carries.
 *
 * The storefront names a point `<store> (<code>)` and Hybris keeps that same code inside
 * `PointOfService.name`, so a point is looked up by matching the code within the name.
 *
 * The address on a PoS is owned by NShift: editing it in Hybris only holds until the next
 * `deliveryGroupFromUnifaun` call writes the upstream value back over it.
 */
export class PointOfServiceCollection {
    constructor(private readonly hac: HAC) { }

    /** The single point whose name carries `code`. Throws when the code is not unique. */
    async find(code: string): Promise<PointOfService> {
        assertNumeric(code, 'Point of Service code');
        const result = await this.hac.executeGroovy(`
            import groovy.json.JsonOutput
            import de.hybris.platform.servicelayer.search.FlexibleSearchQuery

            def query = new FlexibleSearchQuery('''
                SELECT {pk}
                FROM {PointOfService}
                WHERE {name} LIKE ?needle
            ''')
            query.addQueryParameter('needle', '%${code}%')
            def rows = flexibleSearchService.search(query).result.collect { point -> [
                pk: point.pk.toString(),
                name: point.name,
                addressPk: point.address?.pk?.toString(),
                line1: point.address?.line1,
                line2: point.address?.line2,
                town: point.address?.town,
                postalCode: point.address?.postalcode,
                latitude: point.latitude,
                longitude: point.longitude
            ] }
            return JsonOutput.toJson(rows)
        `, false);
        const points = JSON.parse(result) as PointOfService[];
        if (points.length !== 1) {
            throw new Error(`[HAC] [NO DATA] ${points.length} Points of Service match ${code}, expected one`);
        }
        if (!points[0].addressPk) throw new Error(`[HAC] Point of Service ${code} carries no Address object`);
        return points[0];
    }

    /** Writes to the shared environment - keep what `find` returned and put it back. */
    async setAddressLine1(addressPk: string, line1: string): Promise<string> {
        assertNumeric(addressPk, 'Address PK');
        const payload = JSON.stringify({ addressPk, line1 });
        return this.hac.executeGroovy(`
            import groovy.json.JsonSlurper
            import de.hybris.platform.core.PK

            def data = new JsonSlurper().parseText('''${payload}''')
            def address = modelService.get(PK.fromLong(data.addressPk.toLong()))
            address.line1 = data.line1
            modelService.save(address)
            modelService.refresh(address)
            return address.line1
        `);
    }
}
