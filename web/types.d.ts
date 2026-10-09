import { Locator } from 'playwright';

declare global {
    export type LocatorFilter = Parameters<Locator['filter']>[0];
    export type LocatorOptions = Parameters<Locator['locator']>[1];

    export type TradeInData = {
        type?: 'instant' | 'cashback';
        postalCode?: string;
        category?: string;
        brand?: string;
        model?: string;
        subseries?: string;
        device?: string;
        caseType?: string;
        storage?: string;
        variant?: string;
        screenSize?: string;
        color?: string;
        imei?: string;
        deviceConditions?: 'first' | 'last' | 'first-then-last';
    }

    export type TradeUpData = {
        postalCode?: string;
        category?: string;
        model?: string;
        brand?: string;
        serialNumber?: string;
    }

    export type Profile = {
        cluster: string;
        storeDomains?: Record<string, string>;
        storeWebDomains?: Record<string, string>;
        storeNewHybDomains?: Record<string, string>;
        /** Backoffice/HAC origin, for clusters that are not on the shared commerce cloud host. */
        boDomain?: string;
        /** AEM origin by envAEM (e.g. CN: https://p6-pre-qa2.samsung.com.cn). */
        aemDomains?: Record<string, string>;
        exchangeEndpoints?: Record<string, string>;
        tariffEndpoints?: Record<string, string>;
        customerInfo: Record<string, any>;
        customerAddress: Record<string, any>;
        billingAddress: Record<string, any>;
        tradeIn?: TradeInData;
        tradeUp?: TradeUpData;
        simInfo?: Record<string, any>;
        scpInfo?: Record<string, any>;
        preferLoginFrom?: 'Home' | 'Shop' | 'Cart';
        [key: string]: any;
    }

    type PriceData = {
        formattedValue: string;
        value: number;
    }

    export type CartEntry = {
        entryNumber: number;
        isServiceEntry: boolean;
        product: {
            price: any;
            code: string;
            name: string;
        };
        quantity: number;
        totalPrice: PriceData;
        [key: string]: any;
    }

    export type CartInfo = {
        code: string;
        guid: string;
        entries: CartEntry[];
        totalItems: number;
        totalPrice: PriceData;
        [key: string]: any;
    }

    export interface MailService {
        email: string;
        openInbox(): Promise<void>;
        getOTP(this: MailService): Promise<string>;
    }

    export type Order = {
        cancelAllowed: boolean;
        code: string;
        customerCurrentTier: string;
        expensiveProduct: {
            code: string;
            name: string;
        };
        site: string;
        siteName: string;
        status: {
            code: 'ORDER_SPLIT' | 'SHIPPING_REQUESTED' | 'PARTIAL_SHIPPING_REQUESTED' | 'WAITING_FOR_FINANCIAL' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'RETURN_REFUNDED'
        };
        statusDisplay: string;
        store: string;
        subscriptionOrder: boolean;
        totalItems: number;
    }

    export type FetchOrdersResponse = {
        currentOrders: Order[];
        orderYears: number[];
        searchPageData: {
            pagination: {
                currentPage: number;
                numberOfPages: number;
                totalNumberOfResults: number;
            };
            results: Order[];
        }
    }
}

export default global;