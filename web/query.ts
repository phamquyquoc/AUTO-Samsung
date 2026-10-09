import { test } from 'fixtures';

export type Matcher<T> = (items: T[]) => T[] | Promise<T[]>;
export type SyncMatcher<T> = (items: T[]) => T[];

class QueryBuilderBase<T> {
    protected matchers: Matcher<T>[] = [];
    protected criteria = new Set<string>();

    constructor(protected readonly entityName: string) { }

    match(criteria: string, matcher: Matcher<T>): this {
        this.criteria.add(criteria);
        this.matchers.push(matcher);
        return this;
    }

    has(key: string, value?: any): this {
        return this.match(`has ${key}`, all => all.filter(item => {
            const v = (item as Record<string, any>)[key];
            return value !== undefined
                ? (Array.isArray(v) ? v.includes(value) : v === value)
                : v;
        }));
    }

    not(key: string, value?: any): this {
        return this.match(`not has ${key}`, all => all.filter(item => {
            const v = (item as Record<string, any>)[key];
            return value !== undefined
                ? (Array.isArray(v) ? !v.includes(value) : v !== value)
                : !v;
        }));
    }
}

export class SyncQueryBuilder<T> extends QueryBuilderBase<T> {
    findAll(items: T[]): T[] {
        return (this.matchers as SyncMatcher<T>[]).reduce((result, matcher) => matcher(result), items);
    }

    findOne(items: T[]): T {
        const item = this.findAll(items)[0];
        const message = `[NO DATA] No ${this.entityName} match the criteria: ${[...this.criteria].join(', ')}`;
        if (!item) console.error(message);
        test.fixme(!item, message);
        return item;
    }
}

export class AsyncQueryBuilder<T> extends QueryBuilderBase<T> {
    async findAll(items: T[]): Promise<T[]> {
        let result = items;
        for (const matcher of this.matchers) {
            result = await matcher(result);
        }
        return result;
    }

    async findOne(items: T[]): Promise<T> {
        const result = await this.findAll(items);
        const message = `[NO DATA] No ${this.entityName} match the criteria: ${[...this.criteria].join(', ')}`;
        if (!result.length) {
            if (test.info().retry == test.info().project.retries) {
                console.error(message);
                test.fixme(true, message);
            } else {
                throw message;
            }
        }
        return result[0];
    }
}

/** @deprecated Use SyncQueryBuilder or AsyncQueryBuilder */
export class QueryBuilder<T> extends AsyncQueryBuilder<T> { }
