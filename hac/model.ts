import HAC from './hac';

export abstract class Document<T> {
    #hac: HAC;
    protected _doc: T;
    protected _update: Record<string, any>;

    constructor(hac: HAC, data: T) {
        this.#hac = hac;
        this._doc = data as T;
        this._update = {};
    }

    abstract save(): Promise<void>;
}

export abstract class Model<T> {
    #hac: HAC;

    constructor(hac: HAC) {
        this.#hac = hac;
    }

    protected abstract buildQuery(where: Record<string, any>): string;
    protected abstract hydrate(data: T): Document<T>;

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
        return result.length > 0 ? this.hydrate(result[0]) as any : null;
    }

    async findMany(filters: Record<string, any>, maxCount: number = 5): Promise<Model<T>[]> {
        const result = await this.#hac.flexibleSearch(this.buildQuery(filters), { maxCount });
        return result.map(item => this.hydrate(item) as any);
    }
}
