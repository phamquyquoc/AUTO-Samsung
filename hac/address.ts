import HAC from './hac';

export type RemovedCustomerAddress = {
    pk: string;
    line1?: string;
    line2?: string;
    town?: string;
    postalCode?: string;
    shippingAddress: boolean;
    billingAddress: boolean;
};

/**
 * Saved-address test data for the current fixture account.
 *
 * This deliberately cannot accept an arbitrary email. It only operates on the account selected by
 * the current test and refuses every account whose committed metadata is not `addressCount: 0`.
 * Order delivery/billing addresses are not owned by the Customer and therefore cannot enter the
 * deletion query.
 */
export class AddressCollection {
    constructor(private readonly hac: HAC) { }

    async clearCurrentCustomerAddresses(): Promise<RemovedCustomerAddress[]> {
        const account = this.hac.context.account;
        if (!account) throw new Error('[HAC] A current fixture account is required to clear customer addresses');
        if (account.addressCount !== 0) {
            throw new Error(
                `[HAC] Refusing to clear addresses for ${account.email}: account metadata must be addressCount: 0`,
            );
        }

        const payload = JSON.stringify({ uid: account.email });
        const result = await this.hac.executeGroovy(`
            import groovy.json.JsonOutput
            import groovy.json.JsonSlurper
            import de.hybris.platform.servicelayer.search.FlexibleSearchQuery

            def data = new JsonSlurper().parseText('''${payload}''')
            def customerQuery = new FlexibleSearchQuery('SELECT {pk} FROM {Customer} WHERE {uid} = ?uid')
            customerQuery.addQueryParameter('uid', data.uid)
            def customers = flexibleSearchService.search(customerQuery).result
            if (customers.size() != 1) {
                throw new IllegalStateException("Expected exactly one Customer for fixture UID, found \${customers.size()}")
            }
            def customer = customers[0]

            def addressQuery = new FlexibleSearchQuery('SELECT {pk} FROM {Address} WHERE {owner} = ?owner')
            addressQuery.addQueryParameter('owner', customer)
            def addresses = flexibleSearchService.search(addressQuery).result.toList()
            def removed = addresses.collect { address -> [
                pk: address.pk.toString(),
                line1: address.line1,
                line2: address.line2,
                town: address.town,
                postalCode: address.postalcode,
                shippingAddress: address.shippingAddress ?: false,
                billingAddress: address.billingAddress ?: false,
            ] }

            if (customer.defaultShipmentAddress in addresses) customer.defaultShipmentAddress = null
            if (customer.defaultPaymentAddress in addresses) customer.defaultPaymentAddress = null
            modelService.save(customer)
            addresses.each { modelService.remove(it) }

            def remaining = flexibleSearchService.search(addressQuery).result
            if (remaining) {
                throw new IllegalStateException("Customer still owns \${remaining.size()} Address records after cleanup")
            }
            return JsonOutput.toJson(removed)
        `);
        const removed = JSON.parse(result) as RemovedCustomerAddress[];
        console.log(`[HAC] Cleared ${removed.length} saved addresses for addressCount: 0 fixture account`);
        return removed;
    }
}
