import type { Locator, Page } from 'playwright';

export interface GiftItem extends Locator {
    productName: Locator;
    isSelected(): Promise<boolean>;
}

/**
 * Gift page (both BC and PD)
 */
export default class Gift {
    readonly section: Locator;

    private cards: Locator;
    readonly items: GiftItem;

    readonly continueBtn: Locator;

    private giftItem(locator: Locator): GiftItem {
        return Object.assign(
            locator, {
            productName: locator.locator('.hubble-item-card__product'),
            isSelected: () => locator.evaluate(e => e.classList.contains('is-selected'))
        });
    }

    constructor(readonly page: Page) {
        this.section = page.locator('.hubble-addon-page.is-gift-type:visible, .pdd16-step-buying--free-gift:visible');

        this.cards = page.locator('.hubble-addon-page__item, .pdd16-step-buying__card.is-show');
        this.items = this.giftItem(this.cards);

        this.continueBtn = page.locator('[an-la="free gift:continue"], [id="giftContinue"]');
    }

    item(item: string | number | Locator): GiftItem {
        switch (typeof item) {
            case 'string':
                return this.giftItem(this.cards.filter({ has: this.page.getByText(item, { exact: true }) }).first());
            case 'number':
                return this.giftItem(this.cards.nth(item - 1));
            case 'object':
                return this.giftItem(this.cards.filter({ has: item }));
        }
    }
}
