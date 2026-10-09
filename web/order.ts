import { test } from 'fixtures';
import { Account, AccountQuery } from './account';
import { Product } from './product';

export type Order = {
    number: string;
    account: Account;
    products: Product[];
    status: 'Completed' | 'Cancelled' | string;
    [key: string]: any;
}

type OrderMatcher = (orders: Order[]) => Order[] | Promise<Order[]>;

export class OrderQuery {
    private matchers: OrderMatcher[];
    private criteria: Set<string>;

    constructor() {
        this.matchers = [];
        this.criteria = new Set();
    }

    match(criteria: string, matcher: OrderMatcher): OrderQuery {
        this.criteria.add(criteria);
        this.matchers.push(matcher);
        return this;
    }

    has(key: string, value?: any): OrderQuery {
        return this.match(`has ${key}`, all => all.filter(o => value !== undefined ? (Array.isArray(o[key]) ? o[key].includes(value) : o[key] === value) : o[key]));
    }

    not(key: string, value?: any): OrderQuery {
        return this.match(`not has ${key}`, all => all.filter(o => value !== undefined ? (Array.isArray(o[key]) ? !o[key].includes(value) : o[key] !== value) : !o[key]));
    }

    async findAll(orders: Order[]): Promise<Order[]> {
        let result = orders;
        for (const matcher of this.matchers) {
            result = await matcher(result);
        }
        return result;
    }

    async findOne(orders: Order[]): Promise<Order> {
        const result = await this.findAll(orders);
        const message = `[NO DATA] No order match the criteria: ${[...this.criteria].join(', ')}`;
        !result.length && console.error(message);
        test.fixme(!result.length, message);
        return result[0];
    }

    status(status: string) {
        return this.match(`status ${status}`, all => all.filter(o => o.status === status));
    }

    get completed(): OrderQuery {
        return this.status('Completed');
    }

    get cancelled(): OrderQuery {
        return this.status('Cancelled');
    }

    get notCancelled(): OrderQuery {
        return this.match('not cancelled', all => all.filter(o => o.status != 'Cancelled'));
    }

    account(query: AccountQuery) {
        return this.match('account', all => all.filter(o => query.findAll([o.account]).length > 0));
    }

    get accountCanReadEmail(): OrderQuery {
        return this.match('account can read email', all => all.filter(o => o.account?.emailInbox));
    }

    nth(index: number): OrderQuery {
        return this.match(`nth ${index}`, all => all[index - 1] ? [all[index - 1]] : []);
    }
}

export default class OrderFinder {
    static get any(): OrderQuery {
        return new OrderQuery().match('any', all => all.filter(o => o.number[2] != 'S'));
    }

    static number(number: string): OrderQuery {
        return new OrderQuery().match(`number == ${number}`, all => all.filter(o => o.number == number));
    }

    static get standaloneTradeIn(): OrderQuery {
        return new OrderQuery().match('standalone trade in', all => all.filter(o => o.number[2] == 'S'));
    }

    static get reservation(): OrderQuery {
        return new OrderQuery().match('reservation', all => all.filter(o => o.products.some(p => p.reservation)));
    }
}
