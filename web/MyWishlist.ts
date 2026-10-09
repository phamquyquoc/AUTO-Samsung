import { Locator, Page } from 'playwright';

export interface WishlistProduct extends Locator {
    readonly productImage: Locator;
    readonly productName: Locator;
    readonly wishlistIcon: Locator;
    readonly price: Locator;
    readonly color: Locator;
    readonly option: Locator;
    readonly rating: Locator;
    readonly buyNowBtn: Locator;
    readonly stockAlertBtn: Locator;
    readonly removeBtn: Locator;
}

export interface AddCartModal extends Locator {
    button(name: string): Locator;
}

export default class MyWishlist {
    readonly main: Locator;
    readonly title: Locator;
    readonly emptyWishlist: Locator;
    readonly products: WishlistProduct;

    readonly addCartModal: AddCartModal;

    static product(card: Locator): WishlistProduct {
        return Object.assign(card, {
            productImage: card.locator('.wishlist-product__image'),
            productName: card.locator('.wishlist-product__name'),
            wishlistIcon: card.locator('.wishlist-remove-btn'),
            price: card.locator('.wishlist-product-price__main'),
            color: card.locator('.wishlist-product__color'),
            option: card.locator('.wishlist-product-option'),
            rating: card.locator('.wishlist-product-rating'),
            buyNowBtn: card.locator(`
                [data-an-la="buy now"]:visible, 
                [data-an-la="pre order"]:visible
            `),
            stockAlertBtn: card.locator('[data-an-la="stock alert"]:visible'),
            removeBtn: card.locator('.wishlist-remove-btn')
        });
    }

    constructor(readonly page: Page) {
        this.main = this.page.locator('app-wishlist');
        this.title = this.page.locator('.title__main:visible');
        this.emptyWishlist = this.page.locator('.wishlist-empty, .wishlist__empty');
        this.products = MyWishlist.product(page.locator('app-wishlist-product'));

        const addCartModal = this.page.locator('app-add-cart-modal').last();
        this.addCartModal = Object.assign(addCartModal, {
            button: (name: string) => addCartModal.getByRole('button', { name })
        });
    }

    product(item: string | number) {
        if (typeof item === 'number') {
            return MyWishlist.product(this.products.nth(item - 1));
        }
        const name = this.page.locator(`.wishlist-product__name:text-is("${item}")`);
        const sku = this.page.locator(`[data-modelcode="${item}"]`);
        return MyWishlist.product(this.products.filter({ has: name.or(sku) }));
    }
}
