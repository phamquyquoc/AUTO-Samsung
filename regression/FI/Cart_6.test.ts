import { test, expect } from 'fixtures';
import account from 'account';
import product from 'product';

const title = '[Cart_5] Verify recommended product in cart (only Estore)';
const tag = ['@Core'];

test.use({ site: 'FI' });
test.use({ asRegistered: true });
test.use({ account: account.any.canReadEmail });
test.use({ product: product.any.canBuy.has('hasRecommendation') });

test(title, { tag }, async ({ context, page, myOrders, myWishlist, cart, capture }) => {
    const account = context.account!;
    const product = context.product!;

    // 1. Access FI site
    await page.goto(context.cartURL);
    await cart.waitForLoad();
    await cart.clearCart();

    // 2. Add eligible product to Basket
    await cart.addToCart(product);
    await capture('added to cart', cart.main);

    // 3. Go to cart page and verify Recommend products
    const firstProductCardAddableToCart = cart.recommendation.productCards.filter({ has: page.getByRole('button', { name: 'Lisää ostoskoriin' }).first() }).first();
    const skuFirstProductCardAddableToCart = await firstProductCardAddableToCart.locator('> div').getAttribute('data-modelcode');
    const pdpURLFirstProductCardAddableToCart = context.shopURL + '/p/' + skuFirstProductCardAddableToCart;

    const firstProductCardOOS = cart.recommendation.productCards.filter({ has: page.getByRole('button', { name: 'Lisää ostoskoriin' }).first() }).first();
    const skuFirstProductCardOOS = await firstProductCardOOS.locator('> div').getAttribute('data-modelcode');
    const pdpURLFirstProductCardOOS = context.shopURL + '/p/' + skuFirstProductCardOOS;

    // 3. Recommended products should be displayed with name, image, was/now price, color/size option, merchandising flag and CTA Add to cart/Pre-order
    // - Able to add recommended products to cart
    await firstProductCardAddableToCart.getByRole('button', { name: 'Lisää ostoskoriin' }).click();
    await page.waitForTimeout(5000);
    await expect.soft(cart).containSKU(skuFirstProductCardAddableToCart!);
    await cart.cartItem(skuFirstProductCardAddableToCart!).removeBtn.click();
    await page.getByRole('button', { name: 'Kyllä' }).click();
    await page.waitForTimeout(5000);
    await expect.soft(cart).not.containSKU(skuFirstProductCardAddableToCart!, { timeout: 5000 });
    // - Product image is clickable that will redirect the user to PDP page when clicked
    await firstProductCardAddableToCart.locator('img').click();
    await expect.soft(page).navigatedTo(pdpURLFirstProductCardAddableToCart);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);
    await capture('pdp-page-from-recommendation-image');
    await page.goto(context.cartURL);
    await cart.waitForLoad();
    // - Product name is clickable that will redirect the user to PDP page when clicked
    await firstProductCardAddableToCart.locator('[data-an-la="display name click"]').click();
    await expect.soft(page).navigatedTo(pdpURLFirstProductCardAddableToCart);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);
    await capture('pdp-page-from-recommendation-name');
    await page.goto(context.cartURL);
    await cart.waitForLoad();
    // - Out off stock CTA is disable and No action when clicking
    for (let i = 1; i <= 2; i++) {
        await page.evaluate((i) => {
            window.scrollBy(0, window.innerHeight * i);
        }, i);
        await page.waitForTimeout(1000);
        await page.waitForLoadState("domcontentloaded");
    }
    await expect.soft(firstProductCardOOS.getByRole('button', { name: 'Lisää ostoskoriin' })).toBeVisible();
    // - Product in Recommended Products component displays in 1 row and maximum 3 products per row if BDC provides less than 3 items or equal
    await expect.soft(cart.recommendation.productCards).toHaveCount(3);
    // Desktop: it shows only 1 page with 3 products available in tile, with no arrow left/right and swipe icon should only show 1 dot (.)
    await expect.soft(cart.recommendation.nextBtn).toBeHidden();
    await expect.soft(cart.recommendation.previousBtn).toBeHidden();
    await expect.soft(cart.recommendation.section.getByRole('button', { name: 'Page1' })).toBeVisible();
    // Mobile: it shows only 3 pages with 1 product available at a time, only show 3 dots (..)
    // - Only 9 items should be shown in the order of rank for the item list in the API from BDC
    // If BDC returns 14, then 9 products only according to that ranking data in the API spec from BDC

    // 4. Verify Wishlist icon

    // 4. Wishlist icon should be display for all products Recommended
    const allProductCards = await cart.recommendation.productCards.all();
    for (const productCard of allProductCards) {
        await expect.soft(productCard.locator('[data-an-la="add to wishlist"]')).toBeVisible();
    }

    // 5. Click Wishlist icon
    await firstProductCardAddableToCart.locator('[data-an-la="add to wishlist"]').click();

    // 5. Add to wishlist popup will display as translation
    // - Guest user:
    // Add to Wishlist
    // Don't miss out on the products you love. Sign in/Sign up now to access your wishlist on all your devices and get updates on great promotions.
    // CTA: Keep Browsing => Keep curent page
    // CTA: Continue => Redirect to Samsung account page and Log in success
    // - Register:
    // Add to Wishlist
    // Do you want to add this product to your wishlist?
    await expect.soft(page.getByRole('dialog')).toBeVisible();
    // CTA: Keep Browsing: => Keep curent page
    await page.getByRole('button', { name: 'Jatka selailua' }).click();
    await expect.soft(page).toHaveURL(context.cartURL);
    // CTA: Add to Wishlist => Dispaly Wishlist
    await firstProductCardAddableToCart.locator('[data-an-la="add to wishlist"]').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Lisää toivelistaan', exact: true }).click();
    // This product has been added to your wishlist
    await expect(page.getByText('Toivelista Tuote on lisätty')).toBeVisible();
    // CTA: Continue shopping => Keep curent page and Wishlist icon of product change to blue
    await page.getByRole('dialog').getByRole('button', { name: 'Jatka ostoksia' }).click();
    await expect(page.getByText('Toivelista Tuote on lisätty')).toBeHidden();
    expect(page.url()).toBe(context.cartURL);

    // 6. Go to Wishlist page
    await page.goto(context.myWishlistURL);
    await page.waitForLoadState('load');

    // 6. Recommended products added to Wishlist page
    await expect.soft(myWishlist.products.filter({ has: page.locator(`[data-modelcode="${skuFirstProductCardAddableToCart}"]`) })).toBeVisible();
    await myWishlist.products.filter({ has: page.locator(`[data-modelcode="${skuFirstProductCardAddableToCart}"]`) }).getByRole('button', { name: 'wishlist:wishlist cleared' }).click();
});
