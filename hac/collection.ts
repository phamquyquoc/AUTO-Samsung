import HAC from './hac';

export type Model<T> = { [key in keyof T]: T[keyof T] } & {
    save(): Promise<void>;
};

/** Codes, SKUs and PKs go into the Groovy string as-is, so anything else is refused. */
const SAFE = /^[A-Za-z0-9._/-]+$/;

export function assertSafe(value: string, what: string) {
    if (!SAFE.test(value)) throw new Error(`[HAC] Unsafe ${what}: ${value}`);
    return value;
}

export function quote(value: string, what: string) {
    return `'${assertSafe(value, what)}'`;
}

export abstract class Collection<T> {
    #hac: HAC;

    constructor(hac: HAC) {
        this.#hac = hac;
    }

    protected get hac() {
        return this.#hac;
    }

    protected abstract buildQuery(where: Record<string, any>): string;
    protected abstract toModel(hac: HAC, data: T): HACModel<T>;

    protected condition(table: string, key: string, value: any): string {
        switch (typeof value) {
            case 'object':
                if (value.like) return `{${table}.${key}} LIKE '${value.like}'`;
                throw new Error(`Unsupported value: ${JSON.stringify(value)} for key: ${key}`);
            case 'string':
                return `{${table}.${key}} = '${value}'`;
            case 'number':
                return `{${table}.${key}} = ${value}`;
            case 'boolean':
                return `{${table}.${key}} = ${value ? 'true' : 'false'}`;
            default:
                throw new Error(`Unsupported value type: ${typeof value} for key: ${key}`);
        }
    }

    async findOne(filters: Record<string, any>): Promise<Model<T> | null> {
        const result = await this.#hac.flexibleSearch(this.buildQuery(filters));
        return result.length > 0 ? this.toModel(this.#hac, result[0]) as any : null;
    }

    async findMany(filters: Record<string, any>, maxCount: number = 5): Promise<Model<T>[]> {
        const result = await this.#hac.flexibleSearch(this.buildQuery(filters), { maxCount });
        return result.map(item => this.toModel(this.#hac, item) as any);
    }
}

export abstract class HACModel<T> {
    #hac: HAC;
    protected _doc: T;
    protected _update: Record<string, any>;

    constructor(hac: HAC, data: T) {
        this.#hac = hac;
        this._doc = data as T;
        this._update = {};
        return new Proxy(this, {
            get(target, prop) {
                if (Reflect.has(target._doc as object, prop)) {
                    return Reflect.get(target._doc as object, prop);
                }
                return Reflect.get(target, prop);
            },
            set(target, prop, value) {
                if (typeof prop != 'string') return Reflect.set(target, prop, value);
                if (prop in (target._doc as object)) {
                    target._update[prop] = value;
                    return Reflect.set(target._doc as object, prop, value);
                }
                return false;
            }
        });
    }

    abstract save(): Promise<void>;
}
