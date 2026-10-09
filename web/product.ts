import test from '@playwright/test';
import { AsyncQueryBuilder } from './query';

export type Product = {
    sku: string;
    name?: string;
    type?: 'IM' | 'CE' | 'HA' | 'VD' | 'IT' | 'Watch' | 'Ring' | 'Buds';
    subType?: 'Phone' | 'Tablet' | 'TV' | 'DA';
    bcURL?: string;
    pdURL?: string;
    pfURL?: string;
    hasAddOn?: boolean;
    hasGift?: boolean;
    hasMBO?: boolean;
    bespokeSKU?: string;
    preOrder?: boolean;
    backOrder?: boolean;
    outOfStock?: boolean;
    specialPrice?: boolean;
    reservation?: boolean;
    vip?: boolean;
    tradeIn?: boolean;
    overTrade?: boolean;
    tradeUp?: boolean;
    scp?: boolean;
    stdSCP?: boolean;
    subSCP?: boolean;
    daSub?: boolean;
    sim?: boolean;
    flex?: boolean;
    flexUpgrade?: boolean;
    galaxyClub?: boolean;
    knox?: boolean;
    warranty?: boolean;
    canBuy?: boolean;
    deliveryTypes?: string[];
    deliveryOptions?: Record<string, any>;
    deliveryServices?: Record<string, any>;
    notForCheckout?: boolean;

    [key: string]: any;
}

// Delivery service codes: new data nests them under deliveryOptions[].services,
// older site data still keeps a flat deliveryServices map.
function deliveryServicesOf(p: Product): string[] {
    const nested = Object.values(p.deliveryOptions ?? {}).flatMap((o: any) => o.services ?? []);
    return nested.length ? nested : Object.keys(p.deliveryServices ?? {});
}

export class ProductQuery extends AsyncQueryBuilder<Product> {
    constructor() {
        super('product');
    }

    get IM(): ProductQuery {
        return this.match('IM', all => all.filter(p => p.type == 'IM'));
    }

    get CE(): ProductQuery {
        return this.match('CE', all => all.filter(p => p.type == 'CE'));
    }

    get HA(): ProductQuery {
        return this.match('HA', all => all.filter(p => p.type == 'HA'));
    }

    get VD(): ProductQuery {
        return this.match('VD', all => all.filter(p => p.type == 'VD'));
    }

    get IT(): ProductQuery {
        return this.match('IT', all => all.filter(p => p.type == 'IT'));
    }
    
    get Phone(): ProductQuery {
        return this.match('Phone', all => all.filter(p => p.subType == 'Phone'));
    }

    get Tablet(): ProductQuery {
        return this.match('Tablet', all => all.filter(p => p.subType == 'Tablet'));
    }

    get Watch(): ProductQuery {
        return this.match('Watch', all => all.filter(p => p.type == 'Watch'));
    }

    get Ring(): ProductQuery {
        return this.match('Ring', all => all.filter(p => p.type == 'Ring'));
    }

    get Buds(): ProductQuery {
        return this.match('Buds', all => all.filter(p => p.type == 'Buds'));
    }

    get TV(): ProductQuery {
        return this.match('TV', all => all.filter(p => p.subType == 'TV'));
    }

    get DA(): ProductQuery {
        return this.match('DA', all => all.filter(p => p.subType == 'DA'));
    }

    get hasBC(): ProductQuery {
        return this.match('has BC', all => all.filter(p => p.bcURL));
    }

    get hasPD(): ProductQuery {
        return this.match('has PD', all => all.filter(p => p.pdURL));
    }

    get hasPF(): ProductQuery {
        return this.match('has PF', all => all.filter(p => p.pfURL));
    }

    get hasAddOn(): ProductQuery {
        return this.match('has Add-on', all => all.filter(p => p.hasAddOn));
    }

    get noAddOn(): ProductQuery {
        return this.match('No Add-on', all => all.filter(p => p.hasAddOn != true));
    }

    get hasGift(): ProductQuery {
        return this.match('has Gift', all => all.filter(p => p.hasGift));
    }

    get noGift(): ProductQuery {
        return this.match('No Gift', all => all.filter(p => p.hasGift != true));
    }

    get hasMBO(): ProductQuery {
        return this.match('has MBO', all => all.filter(p => p.hasMBO));
    }

    get bespoke(): ProductQuery {
        return this.match('bespoke', all => all.filter(p => p.bespokeSKU));
    }

    get preOrder(): ProductQuery {
        return this.match('pre-order', all => all.filter(p => p.preOrder));
    }

    get backOrder(): ProductQuery {
        return this.match('back order', all => all.filter(p => p.backOrder));
    }

    get outOfStock(): ProductQuery {
        return this.match('out of stock', all => all.filter(p => p.outOfStock));
    }

    get specialPrice(): ProductQuery {
        return this.match('special price', all => all.filter(p => p.specialPrice));
    }

    get tradeIn(): ProductQuery {
        return this.match('Trade-in', all => all.filter(p => p.tradeIn));
    }

    get overTrade(): ProductQuery {
        return this.match('Over trade', all => all.filter(p => p.overTrade));
    }

    get noTradeIn(): ProductQuery {
        return this.match('No Trade-in', all => all.filter(p => p.tradeIn != true));
    }

    get tradeUp(): ProductQuery {
        return this.match('Trade-up', all => all.filter(p => p.tradeUp));
    }

    get scp(): ProductQuery {
        return this.match('SC+', all => all.filter(p => p.scp));
    }

    get stdSCP(): ProductQuery {
        return this.match('Standard SC+', all => all.filter(p => p.stdSCP));
    }

    get subSCP(): ProductQuery {
        return this.match('Sub SC+', all => all.filter(p => p.subSCP));
    }

    get noSCP(): ProductQuery {
        return this.match('No SC+', all => all.filter(p => p.scp != true));
    }

    get daSub(): ProductQuery {
        return this.match('DA Subscription', all => all.filter(p => p.daSub));
    }

    get sim(): ProductQuery {
        return this.match('SIM', all => all.filter(p => p.sim));
    }

    get noSIM(): ProductQuery {
        return this.match('No SIM', all => all.filter(p => p.sim != true));
    }

    get flex(): ProductQuery {
        return this.match('Flex', all => all.filter(p => p.flex));
    }

    get flexUpgrade(): ProductQuery {
        return this.match('Flex Upgrade', all => all.filter(p => p.flexUpgrade));
    }

    get galaxyClub(): ProductQuery {
        return this.match('Galaxy Club', all => all.filter(p => p.galaxyClub));
    }

    get knox(): ProductQuery {
        return this.match('Knox', all => all.filter(p => p.knox));
    }

    get warranty(): ProductQuery {
        return this.match('Warranty', all => all.filter(p => p.warranty));
    }

    get calendarDeliveryOptions(): ProductQuery {
        return this.match('Calendar Delivery Option', all => all.filter(p => p.deliveryOptions && Object.values(p.deliveryOptions).some(o => o.type == 'Calendar')));
    }

    get hasAnyDeliveryServices(): ProductQuery {
        return this.match('has any delivery services', all => all.filter(p => deliveryServicesOf(p).length > 0));
    }

    get deliveryFee(): ProductQuery {
        return this.match('Delivery Fee', all => all.filter(p => p.deliveryOptions && Object.values(p.deliveryOptions).some(o => o.deliveryFee === true)));
    }

    get canBuy(): ProductQuery {
        return this.match('can buy', all => {
            const { retry, project: { retries } } = test.info();
            return [
                ...all.filter(p => p.canBuy),
                ...(process.env.RETRY_CAN_BUY_FALSE && retries && retry == retries ? all.filter(p => p.canBuy === false) : [])
            ];
        });
    }

    get canCheckout(): ProductQuery {
        return this.match('can checkout', all => all.filter(p => p.canBuy && !p.notForCheckout));
    }

    hasDeliveryType(...types: string[]): ProductQuery {
        return this.match(`has delivery type ${types.join(', ')}`, all => all.filter(p => types.every(type => p.deliveryTypes?.includes(type))));
    }

    hasDeliveryOption(...options: string[]): ProductQuery {
        return this.match(`has delivery option ${options.join(', ')}`, all => all.filter(
            p => options.every(o => p.deliveryOptions && p.deliveryOptions[o])
        ));
    }

    hasOneDeliveryOption(...options: string[]): ProductQuery {
        return this.match(`has one delivery option ${options.join(', ')}`, all => all.filter(
            p => options.some(o => p.deliveryOptions && p.deliveryOptions[o])
        ));
    }

    hasDeliveryService(...services: string[]): ProductQuery {
        return this.match(`has delivery service ${services.join(', ')}`, all => all.filter(
            p => services.every(s => deliveryServicesOf(p).includes(s))
        ));
    }

    hasOneDeliveryService(...services: string[]): ProductQuery {
        return this.match(`has one delivery service ${services.join(', ')}`, all => all.filter(
            p => services.some(s => deliveryServicesOf(p).includes(s))
        ));
    }
}

export default class ProductFinder {
    static get any(): ProductQuery {
        return new ProductQuery();
    }

    static sku(sku: string): ProductQuery {
        return new ProductQuery().match(`sku == ${sku}`, all => all.filter(p => p.sku == sku));
    }

    static get reservation(): ProductQuery {
        return new ProductQuery().match('reservation', all => all.filter(p => p.reservation));
    }

    static get noReservation(): ProductQuery {
        return new ProductQuery().match('No reservation', all => all.filter(p => !p.reservation));
    }

    static get vip(): ProductQuery {
        return new ProductQuery().match('VIP', all => all.filter(p => p.vip));
    }

    static in(skus: string[]): ProductQuery {
        return new ProductQuery().match(`in [${skus.join(', ')}]`, all => all.filter(p => skus.includes(p.sku)));
    }

    static notIn(skus: string[]): ProductQuery {
        return new ProductQuery().match(`not in [${skus.join(', ')}]`, all => all.filter(p => !skus.includes(p.sku)));
    }
}
