import { test, expect } from 'fixtures';
import product from 'product';

const title = 'Verify cart components';
const tag = ['@Core'];

test.use({ site: 'FI' });
test.use({ product: product.any.canBuy.has('PDPURL') });

test(title, { tag }, async ({ context, page, cart, capture }) => {
    const product = context.product!;

    // 1. Go to store and add the products to cart
    await page.goto(context.cartURL);
    await cart.waitForLoad();
    await cart.addToCart(product);

    // 2. Verify item on cart
    await capture('item-on-cart', cart.cartItemList);
    await expect.soft(cart).containSKU(product.sku);

    // 2. All items is displayed correctly
    // 2.1 Click on product name/ image
    const newPage = page.context().waitForEvent('page', { timeout: 10000 })
    await cart.cartItem(product.sku).productImage.click();

    // 2.1 Redirect to PDP page
    expect.soft((await newPage).url()).toBe(product.PDPURL);
    (await newPage).bringToFront();
    await capture('pdp-page', page);

    // 2.2 Increase/decrease product quantity
    await page.bringToFront();
    await cart.increaseQuantity(product.sku);

    // 2.2 Qty and price are displayed correctly
    await capture('increase-quantity', cart.main);
    await expect.soft(cart.cartItem(product.sku).quantityInput).toHaveValue('2');
    await cart.decreaseQuantity(product.sku);
    await capture('decrease-quantity', cart.main);
    await expect.soft(cart.cartItem(product.sku).quantityInput).toHaveValue('1');

    // 3. Verify order summary
    // Check Product price/ Subtotal/ Total saving/VAT/ Total price
    const productPrice = await cart.cartItem(product.sku).currentPrice.textContent();

    // 3. All items is displayed correctly
    // Product price/ Subtotal/ Total saving/VAT/ Total price are calculate correctly
    await expect.soft(cart.rhs.totalAmount).toHaveText(productPrice!);

    // 4. Verify Upsellit / Cart recommendation section
    // Setup in BO as Admin user > Component > CartUpsellitRecommendedComponent > Set Visible = True
    // API: https://www.upsellit.com/utility/samsung_feed.jsp?skus=SM-S921BZVDEUB

    // 4. Upsellit / Cart recommendation section will be displayed with correct API
    // - Title and description
    await expect.soft(cart.recommendation.section.locator('.product-recommendation__title')).toBeVisible();
    await cart.recommendation.section.locator('.product-recommendation__title').scrollIntoViewIfNeeded();
    await expect.soft(cart.recommendation.section.locator('.product-recommendation__title')).toHaveText('Sinulle suositeltua');
    await capture('upsellit-title');
    // - Product card with only data:
    const firstProductCard = cart.recommendation.productCards.first();
    const skuFirstProductCard = await firstProductCard.locator('> div').getAttribute('data-modelcode');
    // + Merchandising flag
    // + Product image and Product name > able to direct to PD page
    await firstProductCard.locator('img').click();
    await expect.soft(page).navigatedTo(context.shopURL + '/p/' + skuFirstProductCard);
    await capture('pdp-page-from-upsellit-image');
    await page.goBack();
    await firstProductCard.locator('[data-an-la="display name click"]').click();
    await expect.soft(page).navigatedTo(context.shopURL + '/p/' + skuFirstProductCard);
    await capture('pdp-page-from-upsellit-name');
    // + Color chip, Size, Price/discount price, Add to basket CTA > able to switch color/size and add to cart
    await page.reload({ waitUntil: 'load' });
    await page.locator('[data-an-la="add to cart"]:visible').click();
    await capture('able-to-add-to-cart');
    // - Continue Shopping CTA > able to direct to Homepage
    await page.getByRole('button', { name: 'SIIRRY MAKSAMAAN' }).nth(1).click();
    await expect.soft(page).navigatedTo(context.cartURL);
    await cart.waitForLoad();
    await expect.soft(cart).containSKU(skuFirstProductCard!);
    await capture('recommended-product-added-to-cart');
});
