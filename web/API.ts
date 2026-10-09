import type { Page } from 'fixtures';

export default class API {
    constructor(private page: Page) {
    }

    async getCurrentUserInfo(): Promise<any> {
        try {
            const endpoint = this.page.context().apiEndpoint;
            return this.page.evaluate(async ({ endpoint }) => {
                const curr = JSON.parse(window.localStorage[`spartacus⚿⚿currency`] || '""');
                const lang = JSON.parse(window.localStorage[`spartacus⚿⚿language`] || '""');
                const res = await fetch(`${endpoint}/users/current?lang=${lang}&curr=${curr}`, {
                    headers: { 'accept': 'application/json' },
                    credentials: 'include'
                });
                if (!res.ok) throw `status code: ${res.status}`;
                return res.json();
            }, { endpoint });
        } catch (e: any) {
            throw new Error(`Get current user info error: ${e.message?.replace('page.evaluate: ', '')}`);
        }
    }

    async getCurrentCartInfo(fields = 'FULL'): Promise<CartInfo> {
        try {
            const endpoint = this.page.context().apiEndpoint;
            return this.page.evaluate(async ({ endpoint, fields }) => {
                const curr = JSON.parse(window.localStorage[`spartacus⚿⚿currency`] || '""');
                const lang = JSON.parse(window.localStorage[`spartacus⚿⚿language`] || '""');
                const res = await fetch(`${endpoint}/users/current/carts/current?fields=${fields}&lang=${lang}&curr=${curr}`, {
                    headers: { 'accept': 'application/json' },
                    credentials: 'include'
                });
                if (!res.ok) throw `status code: ${res.status}`;
                return await res.json();
            }, { endpoint, fields });
        } catch (e: any) {
            throw new Error(`Get current cart info error: ${e.message?.replace('page.evaluate: ', '')}`);
        }
    }

    getCartEntry(cartInfo: CartInfo, sku: string): CartEntry | undefined {
        return cartInfo.entries.find(e => e.product.code.toLowerCase() == sku.toLowerCase());
    }

    getCartEntryNumber(cartInfo: CartInfo, sku: string): number {
        const entry = this.getCartEntry(cartInfo, sku);
        return entry ? entry.entryNumber : -1;
    }

    async addToCart(sku: string, quantity: number = 1) {
        try {
            const endpoint = this.page.context().apiEndpoint;
            await this.page.evaluate(async ({ endpoint, sku, quantity }) => {
                const res = await fetch(`${endpoint}/users/current/carts/current/entries`, {
                    method: 'post',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        product: { code: sku },
                        quantity
                    }),
                    credentials: 'include',
                });
                if (!res.ok) {
                    const json = await res.json().catch(() => null);
                    throw json?.errors[0]?.message || `status code: ${res.status}`;
                }
                const json = await res.json().catch(() => null);
                if (json?.errorCode) throw json.statusMessage || json.errorCode;
            }, { endpoint, sku, quantity });
            if (quantity && quantity > 1) {
                console.log(`${quantity} products ${sku} added to cart`);
            } else {
                console.log(`Product ${sku} added to cart`);
            }
        } catch (e: any) {
            throw new Error(`Add ${sku} to cart error: ${e.message?.replace('page.evaluate: ', '')}`);
        }
    }

    async addMultiToCart(sku: string, childSKU: string, quantity = 1) {
        try {
            const endpoint = this.page.context().apiEndpoint;
            const data = [{
                productCode: sku,
                qty: quantity,
                childProducts: [{ product: { code: childSKU }, quantity: 1 }],
            }];
            await this.page.evaluate(async ({ endpoint, data }) => {
                const res = await fetch(`${endpoint}/addToCart/multi/?fields=BASIC`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(data),
                    credentials: 'include'
                });
                if (!res.ok) {
                    const json = await res.json().catch(() => null);
                    throw json?.errors[0]?.message || `status code: ${res.status}`;
                }
            }, { endpoint, data });
        } catch (e: any) {
            throw new Error(`Add ${sku} with child product ${childSKU} to cart error: ${e.message?.replace('page.evaluate: ', '')}`);
        }
    }

    async addServiceToCart(entryNumber: number, data: Record<string, any>) {
        const endpoint = this.page.context().apiEndpoint;
        const storeID = this.page.context().storeID;
        await this.page.evaluate(async ({ endpoint, storeID, entryNumber, data }) => {
            const cardID = window.sessionStorage.ref || JSON.parse(window.localStorage[`spartacus⚿${storeID}⚿cart`]).active;
            const curr = JSON.parse(window.localStorage[`spartacus⚿⚿currency`]);
            const lang = JSON.parse(window.localStorage[`spartacus⚿⚿language`]);
            const res = await fetch(
                `${endpoint}/users/current/carts/${cardID}/entries/${entryNumber}/services?lang=${lang}&curr=${curr}`,
                {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(data),
                    credentials: 'include',
                }
            );
            if (!res.ok) throw `status code: ${res.status}`;
        }, { endpoint, storeID, entryNumber, data });
    }

    async addedOldServiceToCart(data: Record<string, any>) {
        const endpoint = this.page.context().apiEndpoint;
        return this.page.evaluate(async ({ endpoint, data }) => {
            const res = await fetch(
                `${endpoint}/addToCart/multi/?fields=BASIC&newCart=true`,
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(data),
                    credentials: "include",
                }
            );
            if (!res.ok) {
                throw new Error('Response status code: ' + res.status);
            }
            return res.text();
        }, { endpoint, data });
    }

    async deleteCartEntry(entry: number) {
        const endpoint = this.page.context().apiEndpoint;
        return this.page.evaluate(async ({ endpoint, entry }) => {
            const res = await fetch(`${endpoint}/users/current/carts/current/entries/${entry}`, {
                method: 'DELETE',
                credentials: 'include'
            })
            if (res.status >= 500) throw new Error(`Delete cart entry error: ${res.status}`);
            return res.status;
        }, { endpoint, entry });
    }

    async getCurrentAddresses() {
        const endpoint = this.page.context().apiEndpoint;
        return await this.page.evaluate(async ({ endpoint }) => {
            const res = await fetch(`${endpoint}/users/current/addresses`, {
                credentials: "include"
            });

            if (!res.ok) {
                throw new Error(`Get current addresses failed: ${res.status}`);
            }

            return res.json();
        }, { endpoint });
    }

    async getDeliveryInfo(postCode = '') {
        const endpoint = this.page.context().apiEndpoint;
        return this.page.evaluate(async ({ endpoint, postCode }) => {
            const curr = JSON.parse(window.localStorage[`spartacus⚿⚿currency`]);
            const lang = JSON.parse(window.localStorage[`spartacus⚿⚿language`]);
            const res = await fetch(`${endpoint}/users/current/carts/current/deliverymodes?lang=${lang}&curr=${curr}&postCode=${postCode}`, {
                headers: { 'accept': 'application/json' },
                credentials: 'include'
            });
            if (!res.ok) throw new Error(`Get delivery info failed ${res.status} `);
            return res.json();
        }, { endpoint, postCode });
    }

    async getOrderInfo(code: string) {
        const endpoint = this.page.context().apiEndpoint;
        const res = await this.page.request.get(`${endpoint}/users/current/orders/${code}?fields=FULL`, {
            headers: {
                'accept': 'application/json',
                'contentType': 'application/json'
            },
        });
        if (!res.ok) throw new Error(`Get order detail fail ${res.status}`);
        return res.json();
    }

    async fetchOrders(page = 1, year?: number): Promise<FetchOrdersResponse> {
        const endpoint = this.page.context().apiEndpoint;
        return this.page.evaluate(async ({ endpoint, page, year }) => {
            const curr = JSON.parse(window.localStorage[`spartacus⚿⚿currency`]);
            const lang = JSON.parse(window.localStorage[`spartacus⚿⚿language`]);
            const yearParam = year ? `&year=${year}` : '';
            const res = await fetch(`${endpoint}/users/current/orders?currentPage=${page - 1}${yearParam}&lang=${lang}&curr=${curr}`, {
                headers: { 'accept': 'application/json' },
                credentials: "include"
            });
            if (!res.ok) {
                throw 'Fetch orders error with status code: ' + res.status;
            }
            return res.json();
        }, { endpoint, page, year });
    }

    async getEstimatedRewardPoints() {
        const endpoint = this.page.context().apiEndpoint;
        const res = await this.page.request.get(`${endpoint}/users/current/carts/current/rewards/getEstimatedRewardPoints?fields=FULL`, {
            headers: {
                'accept': 'application/json',
                'contentType': 'application/json'
            },
        });
        if (!res.ok) throw new Error(`Get estimated reward points fail ${res.status}`);
        return res.json();
    }

    async getSIMPlans(sku: string): Promise<Record<string, any>[]> {
        const endpoint = this.page.context().apiEndpoint;
        const tariffEndpoint = this.page.context().tariffEndpoint;
        let url = tariffEndpoint
            ? `${tariffEndpoint}/sku/${sku}/plans?fields=DEFAULT`
            : `${endpoint}/carriers/device/${sku}/plans?fields=DEFAULT`;
        return this.page.evaluate(async (url) => {
            const res = await fetch(url, {
                method: "GET",
                credentials: "include"
            });
            if (!res.ok) {
                throw new Error('response status code: ' + res.status);
            }
            const data = await res.json();
            return data.carriers.reduce((p: any, c: any) => [...p, ...c.tariffPlans], []);
        }, url);
    }

    async getSIMServiceCode(sku: string, carrier: any): Promise<string> {
        const endpoint = this.page.context().apiEndpoint;
        return this.page.evaluate(async ({ endpoint, sku, carrier }) => {
            const res = await fetch(`${endpoint}/products/${sku}?fields=FULL`, {
                method: "GET",
                credentials: "include"
            });
            if (!res.ok) {
                throw new Error("Response status code: " + res.status);
            }
            const data = await res.json();
            return data.availableServices
                .find((s: any) => s.serviceCategory.code.toLowerCase() == 'sim_plan')
                .addedServiceConfig.configParameters.entry
                .find((e: any) => e.key == 'carrier.service.sku.code.' + carrier).value;
        }, { endpoint, sku, carrier });
    }

    async getRelatedCategorizedProducts(sku: string, queryType: string, categoryPrefix: string, fields = 'SIMPLE_INFO') {
        const endpoint = this.page.context().apiEndpoint;
        return this.page.evaluate(async ({ endpoint, sku, fields, queryType, categoryPrefix }) => {
            const res = await fetch(`${endpoint}/products/${sku}/relatedCategorizedProducts?fields=${fields}&queryType=${queryType}&categoryPrefix=${categoryPrefix}`, {
                headers: { 'accept': 'application/json' },
                credentials: "include"
            });
            if (!res.ok) {
                throw new Error(`Get related categorized products by API error with status code: ${res.status}`);
            }
            return res.json();
        }, { endpoint, sku, fields, queryType, categoryPrefix });
    }

    async getSMCServices(sku: string): Promise<Record<string, any>[]> {
        let category = 'smc';
        const siteUid = this.page.context().storeID.toLowerCase();
        const serviceData = this.page.context().profile.serviceData;
        if (serviceData.SMC) {
            if (serviceData.SMC[`${siteUid}_CategoryCode`]) {
                category = serviceData.SMC[`${siteUid}_CategoryCode`];
            } else if (serviceData.SMC.categoryCode) {
                category = serviceData.SMC.categoryCode;
            }
        }
        return this.getExternalServices(sku, category, 'SMC');
    }

    async getProductOffer(sku: string) {
        const endpoint = this.page.context().apiEndpoint;
        return this.page.evaluate(async ({ endpoint, sku }) => {
            const res = await fetch(`${endpoint}/products/${sku}/offers?fields=SIMPLE_INFO`, {
                headers: { 'accept': 'application/json' },
                credentials: "include"
            })
            if (!res.ok) {
                throw 'Get product offer info by API error with status code: ' + res.status;
            }
            return res.json();
        }, { endpoint, sku });
    }

    async getExternalServices(sku: string, category: string, provider: string): Promise<Record<string, any>[]> {
        const endpoint = this.page.context().apiEndpoint;
        return this.page.evaluate(async ({ endpoint, sku, category, provider }) => {
            const res = await fetch(`${endpoint}/servicesv2/externalService/${sku}?categoryCode=${category}&provider=${provider}`, {
                method: "GET",
                credentials: "include"
            })
            if (!res.ok) {
                throw new Error("Response status code: " + res.status);
            }
            const data = await res.json();
            return data.serviceProductDataGroup.serviceProducts.reduce((p: any, c: any) => [...p, ...c.serviceProductVariants], []);
        }, { endpoint, sku, category, provider });
    }

    async getBrityProcess(processName: string) {
        for (let tries = 1; tries <= 3; tries++) {
            try {
                const res = await this.page.request.get('https://bwrpa.samsungsds.com:8777/asset/api/v1/objects/type/process', {
                    headers: { 'Authorization': 'Bearer ' + process.env.BRITY_TOKEN }
                });
                const processes: any[] = await res.json();
                const proc = processes.find(p => p.name == processName);
                if (!proc) throw new Error(`${processName} not found`);
                return proc;
            } catch (error) {
                if (tries == 3) throw error;
                await this.page.waitForTimeout(10000);
            }
        }
    }

    async createBrityJob(processId: string, jobParameter: any) {
        for (let tries = 1; tries <= 3; tries++) {
            try {
                const res = await this.page.request.post('https://bwrpa.samsungsds.com:8777/scheduler/api/v1/jobs', {
                    headers: { 'Authorization': 'Bearer ' + process.env.BRITY_TOKEN },
                    data: {
                        processId: processId,
                        jobParameter: JSON.stringify(jobParameter)
                    }
                });
                const jobInfo = await res.json();
                console.log(`Brity job created:\n${JSON.stringify(jobInfo, null, 2)}`);
                return jobInfo;
            } catch (error) {
                if (tries == 3) throw error;
                await this.page.waitForTimeout(10000);
            }
        }
    }

    async waitForBrityJobDone(jobId: string, timeout = 1800) {
        let jobInfo: any;
        for (let i = 0; i <= Math.floor(timeout / 10); i++) {
            for (let tries = 1; tries <= 3; tries++) {
                try {
                    const res = await this.page.request.get('https://bwrpa.samsungsds.com:8777/scheduler/api/v1/jobs/' + jobId, {
                        headers: { 'Authorization': 'Bearer ' + process.env.BRITY_TOKEN }
                    });
                    jobInfo = await res.json();
                } catch (error) {
                    if (tries == 3) throw error;
                    await this.page.waitForTimeout(10000);
                }
            }
            if (jobInfo.statusCode == 4) break;
            console.log(`Brity job status: ${jobInfo.statusName}, detail: ${jobInfo.detailName}`);
            await this.page.waitForTimeout(10000);
        }
        if (jobInfo.statusCode != 4) throw new Error(`Brity processing not finish: ${jobInfo?.statusName}`);
        if (jobInfo.detailCode != 1) throw new Error(`Brity processing not success: status: ${jobInfo.statusName}, detail: ${jobInfo.detailName}`);
        console.log(`Brity job done:\n${JSON.stringify(jobInfo, null, 2)}`);
    }

    async deleteAddressById(addressId: string) {
        const endpoint = this.page.context().apiEndpoint;
        return await this.page.evaluate(async ({ endpoint, addressId }) => {
            const res = await fetch(`${endpoint}/users/current/addresses/${addressId}`, {
                method: "DELETE",
                credentials: "include"
            });

            if (!res.ok && res.status >= 500) {
                throw new Error(`Delete address failed: ${res.status}`);
            }

            return res.status;
        }, { endpoint, addressId });
    }

    async clearAddresses() {
        const data = await this.getCurrentAddresses();
        const addresses = data?.addresses || [];

        if (addresses.length === 0) {
            console.log('There is no address');
        }

        for (const addr of addresses) {
            await this.deleteAddressById(addr.id);
            console.log(`Deleted address ID: ${addr.id}`);
        }

        console.log(`Total deleted: ${addresses.length}`);
        await this.page.reload();
    }

    async getProductByCodes(skus: string[]) {
        const endpoint = this.page.context().apiEndpoint;
        return this.page.evaluate(async ({ endpoint, skus }) => {
            const res = await fetch(`${endpoint}/products?productCodes=${skus.join(',')}&fields=FULL`, {
                headers: { 'accept': 'application/json' },
                credentials: "include"
            })
            if (!res.ok) {
                throw 'Get product info by API error with status code: ' + res.status;
            }
            return res.json();
        }, { endpoint, skus });
    }

    async getWishlistProducts() {
        const endpoint = this.page.context().apiEndpoint;
        return this.page.evaluate(async ({ endpoint }) => {
            const res = await fetch(`${endpoint}/users/current/wishlist?fields=FULL`, {
                headers: { 'accept': 'application/json' },
                credentials: "include"
            });
            if (!res.ok) {
                throw 'Get wishlist products by API error with status code: ' + res.status;
            }
            return res.json();
        }, { endpoint });
    }

    async removeProductFromWishlist(productCode: string) {
        const endpoint = this.page.context().apiEndpoint;
        await this.page.evaluate(async ({ endpoint, productCode }) => {
            const curr = JSON.parse(window.localStorage[`spartacus⚿⚿currency`] || '""');
            const lang = JSON.parse(window.localStorage[`spartacus⚿⚿language`] || '""');
            const wishlistName = 'My Wishlist';
            const params = new URLSearchParams({ productCode, wishlistName, lang, curr });
            const res = await fetch(`${endpoint}/users/current/wishlist/removeProductFromWishlist?${params}`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: '{}',
                credentials: 'include'
            });
            if (!res.ok) {
                throw new Error(`remove product from wishlist failed: ${res.status}`);
            }
            return await res.json();
        }, { endpoint, productCode });
    }

    async clearAllWishlistProducts() {
        const data = await this.getWishlistProducts();
        const entries = data?.wishlists?.[0]?.entries ?? [];

        if (entries.length === 0) {
            console.log('There is no wishlist product');
            return;
        }

        for (const entry of entries) {
            const productCode = entry.product?.code;
            if (!productCode) continue;
            await this.removeProductFromWishlist(productCode);
            console.log(`Product ${productCode} removed from wishlist`);
        }
        console.log('All wishlist products removed');
        await this.page.reload();
    }
}
