import { Account, AccountQuery } from './account';
import { Product, ProductQuery } from './product';
import { AsyncQueryBuilder } from './query';

export type Promotion = {
    /** Free-form: every site names its own promotion types and the query matches on this. */
    type: string;
    code?: string;
    voucherCode?: string;
    couponCode?: string;
    account?: Account;
    product?: Product;
    product2?: Product;
    product3?: Product;

    [key: string]: any;
}

export class PromotionQuery extends AsyncQueryBuilder<Promotion> {
    constructor() {
        super('promotion');
    }

    account(query: AccountQuery) {
        return this.match('account', all => all.filter(o => o.account && query.findAll([o.account]).length > 0));
    }

    matchProduct(key: string, query: ProductQuery) {
        return this.match(key, async all => {
            const result: Promotion[] = [];
            for (const promotion of all) {
                if (promotion[key] && (await query.findAll([promotion[key]])).length > 0) {
                    result.push(promotion);
                }
            }
            return result;
        });
    }

    product(query: ProductQuery) {
        return this.matchProduct('product', query);
    }

    product2(query: ProductQuery) {
        return this.matchProduct('product2', query);
    }

    product3(query: ProductQuery) {
        return this.matchProduct('product3', query);
    }
}

export default class PromotionFinder {
    static get any(): PromotionQuery {
        return new PromotionQuery();
    }

    static type(type: string): PromotionQuery {
        return new PromotionQuery().match(`type == ${type}`, all => all.filter(p => p.type == type));
    }

    static code(code: string): PromotionQuery {
        return new PromotionQuery().match(`code == ${code}`, all => all.filter(p => p.code == code));
    }
}
