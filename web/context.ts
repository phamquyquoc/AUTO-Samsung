import assert from 'assert';
import type { BrowserContext, Page as BasePage } from 'playwright';
import type { Account } from './account';
import type { Product } from './product';
import type { Promotion } from './promotion';
import type { Order } from './order';

export type AEMEnv = 'prod' | 'p6-pre-qa' | 'p6-pre-qa2';

export type HybridEnv = 'prod' | 'stg2';

export type TestEnv = {
    site: string;
    env: HybridEnv;
    envAEM: AEMEnv;
    profile: Profile;
    asRegistered: boolean;
    workingDir?: string;
    envConfig: Record<string, any>;
    boInfo: {
        account: string;
        role?: string;
    }
}

export type TestData = {
    account?: Account;
    product?: Product;
    product2?: Product;
    product3?: Product;
    product4?: Product;
    product5?: Product;
    promotion?: Promotion;
    promotion2?: Promotion;
    promotion3?: Promotion;
    promotion4?: Promotion;
    promotion5?: Promotion;
    promotion6?: Promotion;
    order?: Order;

    checkoutEmail: string;
}

export type TestState = {
    cookieRequested?: boolean;
    wdsReady?: boolean;
    pointingRequested?: boolean;
    countrySelected?: boolean;
    ssoSignedIn?: boolean;

    /** Per-test trade-in/up overrides, set via withTradeIn / withTradeUp. */
    tradeIn?: Omit<Partial<TradeInData>, 'imei'> & { imei?: string | string[] };
    tradeUp?: Partial<TradeUpData>;
}

export type TestContext = TestEnv & TestData & TestState & {
    cluster: string;
    storeID: string;
    apiDomain: string;
    apiEndpoint: string;
    cookieURL: string;
    pointingURL: string;
    exchangeEndpoint: string;
    tariffEndpoint: string;
    boURL: string;
    boPassword: string;
    homeURL: string;
    shopURL: string;
    cartURL: string;
    checkoutURL: string;
    splashURL: string;
    myPageURL: string;
    myOrdersURL: string;
    myRewardURL: string;
    myVoucherURL: string;
    myWishlistURL: string;
    myProfileURL: string;

    withTradeIn(data: Partial<TradeInData>): void;
    withTradeUp(data: Partial<TradeUpData>): void;
    withTradeInIMEI(imei: string | string[]): void;
    withPostalCode(postalCode: string): void;
}

export type Context = BrowserContext & TestContext;

export type Page = Omit<BasePage, 'context'> & {
    context(): Context;
}

const SITE_MAP: Record<string, string> = {
    'JO': 'levant',
    'JO_AR': 'levant_ar',
    'MA': 'n_africa',
    'KW': 'ae',
    'BH': 'ae',
    'OM': 'ae',
    'QA': 'ae',
    'KW_AR': 'ae_ar',
    'BH_AR': 'ae_ar',
    'OM_AR': 'ae_ar',
    'QA_AR': 'ae_ar',
}

const BO_URL_MAP: Record<string, string> = {
    'SMA': 'l5-s2',
    'SMB': 'e12-s2',
    'SMC': 'el4-s2',
    'SMI': 'el2-s2',
    'SMN': 'el1-s2',
    'SMN2': 'el6-s2',
    'SMN3': 'el7-s2',
    'SMN4': 'e10-s2',
    'SMN5': 'e11-s2',
    'SMR': 'el9-s2',
    'SMS': 'el3-s2'
}

export function testContext(data: TestEnv & TestData): TestContext {
    return {
        ...data,
        get cluster() {
            return this.profile.cluster;
        },
        get storeID() {
            return this.site.toLowerCase();
        },
        get apiDomain() {
            return this.profile.storeNewHybDomains?.[this.env] || this.profile.storeDomains?.[this.env]!;
        },
        get apiEndpoint() {
            return `${this.apiDomain}/tokocommercewebservices/v2/${this.storeID}`;
        },
        get cookieURL() {
            if (this.site == 'CN') {
                return `https://${this.env}.shop.samsung.com.cn/getcookie.html`;
            }
            return `https://${this.env}.shop.samsung.com/getcookie.html`;
        },
        get pointingURL() {
            const siteLower = this.site.toLowerCase();
            const siteCode = SITE_MAP[this.site] || siteLower;
            const storeWebDomain = this.profile.storeWebDomains?.[this.env]
                || `https://${this.env == 'prod' ? '' : this.env + '.'}shop.samsung.com`;
            const isGCC = ['BH', 'BH_AR', 'KW', 'KW_AR', 'OM', 'OM_AR', 'QA', 'QA_AR'].includes(this.site);
            const cart = isGCC ? this.cartURL.replace(`/${siteLower}/`, `/${SITE_MAP[this.site]}/`) : this.cartURL;
            const params = new URLSearchParams({ siteCode, storeWebDomain, cart });
            if (this.profile.storeDomains?.[this.env]) params.set('storeDomain', this.profile.storeDomains?.[this.env]);
            if (this.profile.storeNewHybDomains?.[this.env]) params.set('storeNewHybDomain', this.profile.storeNewHybDomains?.[this.env]);
            const gpvStoreDomain = (this.exchangeEndpoint || this.tariffEndpoint)?.split(/\/v\d/)[0];
            if (gpvStoreDomain) params.set('gpvStoreDomain', gpvStoreDomain);
            const aemOrigin = this.profile.aemDomains?.[this.envAEM] || `https://${this.envAEM}.samsung.com`;
            return `${aemOrigin.replace(/\/$/, '')}/aemapi/v6/storedomain/setdata?${params}`;
        },
        get exchangeEndpoint() {
            return this.profile.exchangeEndpoints?.[this.env]!;
        },
        get tariffEndpoint() {
            return this.profile.tariffEndpoints?.[this.env]!;
        },
        get boURL() {
            if (this.profile.boDomain) return `${this.profile.boDomain}/backoffice`;
            return `https://backoffice.cnmzsgcaar-samsung${BO_URL_MAP[this.cluster]}-public.model-t.cc.commerce.ondemand.com/backoffice`;
        },
        get boPassword() {
            const cluster = this.profile.cluster;
            const passwordEnv = `${this.boInfo.account.toUpperCase()}_${cluster}_PASSWORD`;
            assert(process.env[passwordEnv], `Backoffice password ${passwordEnv} is not set`);
            return process.env[passwordEnv]!;
        },
        get homeURL() {
            if (this.site == 'CN') {
                return `https://${this.envAEM}.samsung.com.cn`;
            }
            const site = SITE_MAP[this.site] || this.site.toLowerCase();
            if (this.envAEM == 'prod') {
                return `https://samsung.com/${site}`;
            }
            return `https://${this.envAEM}.samsung.com/${site}`;
        },
        get shopURL() {
            const site = this.site.toLowerCase();
            const web = this.profile.storeWebDomains?.[this.env];
            if (web) return `${web.replace(/\/$/, '')}/${site}`;
            const sub = (this.env && this.env != 'prod') ? this.env + '.' : '';
            return `https://${sub}shop.samsung.com/${site}`;
        },
        get cartURL() {
            return this.shopURL + '/cart';
        },
        get checkoutURL() {
            return this.shopURL + '/checkout/one';
        },
        get splashURL() {
            return this.shopURL + '/guestlogin/checkout';
        },
        get myPageURL() {
            return this.homeURL + '/mypage';
        },
        get myOrdersURL() {
            return this.shopURL + '/mypage/orders';
        },
        get myRewardURL() {
            if (['KW', 'KW_AR', 'OM', 'OM_AR'].includes(this.site)) {
                return this.shopURL + '/mypage/rewardPointsPage';
            }
            return this.homeURL + '/mypage/rewards/';
        },
        get myVoucherURL() {
            return this.shopURL + '/mypage/vouchers';
        },
        get myWishlistURL() {
            return this.shopURL + '/mypage/wishlist';
        },
        get myProfileURL() {
            return this.shopURL + '/mypage/profile-setting';
        },
        withTradeIn(data: Partial<TradeInData>) {
            this.tradeIn = { ...this.tradeIn, ...data };
        },
        withTradeUp(data: Partial<TradeUpData>) {
            this.tradeUp = { ...this.tradeUp, ...data };
        },
        withTradeInIMEI(imei: string | string[]) {
            this.tradeIn = { ...this.tradeIn, imei };
        },
        withPostalCode(postalCode: string) {
            this.profile.customerAddress = { ...this.profile.customerAddress, postalCode };
        },
    }
}
