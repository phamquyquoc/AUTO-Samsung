import HAC from './hac';
import { Collection, HACModel } from './collection';

export type Order = {
    pk: string;
    code: string;
    customerType: string;
    orderType: string;
    status: string;
}

export class OrderCollection extends Collection<Order> {
    protected buildQuery(filters: Record<string, any>) {
        let fields: string[] = [
            '{o.pk} AS pk',
            '{o.code} AS code',
            '{o.customerType} AS customerType',
            '{o.ordertype} AS orderType',
            '{s.code} AS status',
            '*'
        ];
        let from = `
            Order AS o
            JOIN EnumerationValue AS s ON {o.status} = {s.pk}
        `;
        let whereArr: string[] = [];
        for (const [key, value] of Object.entries(filters)) {
            switch (key) {
                default:
                    whereArr.push(this.condition('o', key, value));
            }
        }
        const query = `SELECT ${fields.join(', ')} FROM {${from}} ${whereArr.length > 0 ? `WHERE ${whereArr.join(' AND ')}` : ''}`;
        return query;
    }

    protected toModel(hac: HAC, data: Order) {
        return new OrderModel(hac, data);
    }
}

export class OrderModel extends HACModel<Order> {
    async save() {
        console.log(this._update);
        Reflect.set(this, '_update', {});
    }
}
