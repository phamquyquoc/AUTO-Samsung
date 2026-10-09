import { SyncQueryBuilder } from './query';

export type Account = {
    email: string;
    password: string;
    new?: boolean;
    addressCount?: number;
    orderCount?: number;
    wishlistCount?: number;
    savedCardsCount?: number;
    emailInbox?: {
        url: string;
        email: string;
        password?: string;
    };
    hasCredit?: boolean;
    reward?: {
        level?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | string;
        points?: number;
        globalPoints?: Record<string, number>;
    };
    lastLoginAt?: Date;

    [key: string]: any;
}

export class AccountQuery extends SyncQueryBuilder<Account> {
    constructor() {
        super('account');
    }

    get new(): AccountQuery {
        return this.match('new', all => all.filter(a => a.new === true));
    }

    get canReadEmail(): AccountQuery {
        return this.match('can read email', all => all.filter(a => a.emailInbox));
    }

    get hasAddresses(): AccountQuery {
        return this.match('has addresses', all => all.filter(a => !!a.addressCount && a.addressCount > 0));
    }

    get notHasAddresses(): AccountQuery {
        return this.match('no addresses', all => all.filter(a => a.addressCount === 0));
    }

    get hasOrders(): AccountQuery {
        return this.match('has orders', all => all.filter(a => !!a.orderCount && a.orderCount > 0));
    }

    get noOrders(): AccountQuery {
        return this.match('no orders', all => all.filter(a => a.orderCount === 0));
    }

    get hasWishlists(): AccountQuery {
        return this.match('has wishlists', all => all.filter(a => !!a.wishlistCount && a.wishlistCount > 0));
    }

    get hasSavedCards(): AccountQuery {
        return this.match('has saved cards', all => all.filter(a => !!a.savedCardsCount && a.savedCardsCount > 0));
    }

    get notHasSavedCards(): AccountQuery {
        return this.match('no saved cards', all => all.filter(a => a.savedCardsCount === 0));
    }

    get hasRewardPoints(): AccountQuery {
        return this.match('has reward points', all => all.filter(a => typeof a.reward === 'object' && a.reward?.points));
    }

    get hasGlobalPoints(): AccountQuery {
        return this.match('has global points', all => all.filter(a => typeof a.reward?.globalPoints === 'object' && Object.values(a.reward.globalPoints).some(p => p > 0)));
    }

    hasPoints(country: string): AccountQuery {
        return this.match(`has ${country} points`, all => all.filter(a => typeof a.reward?.globalPoints === 'object' && a.reward?.globalPoints[country]));
    }

    get noGlobalPoints(): AccountQuery {
        return this.match('no global points', all => all.filter(a => typeof a.reward?.globalPoints === 'object' && Object.values(a.reward.globalPoints).every(p => p === 0)));
    }
    get noPoints(): AccountQuery {
        return this.match('no points', all => all.filter(a => typeof a.reward === 'object' && a.reward?.points === 0));
    }

    rewardLevel(level: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | string): AccountQuery {
        return this.match(`reward level ${level}`, all => all.filter(a => typeof a.reward === 'object' && a.reward.level === level));
    }
}

export default class AccountFinder {
    static get any(): AccountQuery {
        return new AccountQuery();
    }

    static email(email: string): AccountQuery {
        return new AccountQuery().match(`email == ${email}`, all => all.filter(a => a.email == email));
    }

    static get hasCredit(): AccountQuery {
        return new AccountQuery().match('has credit', all => all.filter(a => a.hasCredit === true));
    }

    static get reward(): AccountQuery {
        return new AccountQuery().match('reward', all => all.filter(a => !!a.reward));
    }

    static notIn(emails: string[]): AccountQuery {
        return new AccountQuery().match(`not in [${emails.join(', ')}]`, all => all.filter(a => !emails.includes(a.email)));
    }
};
