import { test, expect } from 'fixtures';
import product from 'product';

const title = '[Cart_1] Verify pre-order, back-order and RHS summary in cart page';
const tag = ['@Core'];

test.use({ site: 'FI' });
test.use({ product: product.any.preOrder.canBuy });
test.use({ product2: product.any.backOrder.canBuy });
test.use({ product3: product.any.has("preOrderExpired") });
test.use({ product4: product.any.has("backOrderExpired") });

test(title, { tag }, async ({ context, page, cart, capture }) => {
    const product = context.product!;
    const product2 = context.product2!;
    const product3 = context.product3!;
    const product4 = context.product4!;

    await page.goto(context.cartURL);
    await cart.waitForLoad();
    await cart.addToCart(product);
    await cart.addToCart(product2);

    await capture('item-on-cart', cart.main);
    await expect.soft(cart).containSKU(product.sku);
    await expect.soft(cart).containSKU(product2.sku);
    const cartItem1 = cart.cartItem(product.sku)!;
    const cartItem2 = cart.cartItem(product2.sku)!;
    await capture('added to cart', cart.main);

    // [Pre-order]
    // 6. Verify Pre-order flag and shipping schedule of pre-order product

    // 6. Pre-order product display: pre-order tag and delivery date in duration. Number on Cart icon should increase
    await expect.soft(cartItem1.section.locator('.pre-back-order-message-text__global')).toBeVisible();
    await expect.soft(cartItem1.section.locator('.pre-back-order-message-text__global')).toHaveText(/Toimitukset alkavat arviolta \d{2}\.\d{2}\.\d{4}/);
    await capture('pre-order message', cartItem1.section);

    // 7. Verify Pre-order flag and shipping schedule of pre-order product which its date has ended
    await page.goto(product3.PDPURL);

    // 7. Pre-order should display as out of stock when max qty is reached.
    await expect.soft(page.locator('[data-an-la="stock alert"]:visible')).toBeVisible();
    await expect.soft(page.getByText('Sold out. Get stock alert to')).toBeVisible();
    await capture('Pre-order should display as out of stock', page);

    // [Back-order]
    // 8. Verify Back-order flag and shipping schedule of pre-order product
    await page.goto(context.cartURL);
    await cart.waitForLoad();

    // 8. Back-order product display: back-order tag and delivery date in duration. Number on Cart icon should increase
    await expect.soft(cartItem2.section.locator('.pre-back-order-message-text__global')).toBeVisible();
    await expect.soft(cartItem2.section.locator('.pre-back-order-message-text__global')).toHaveText(/Arvioitu lähetyspäivä \d{2}\. syyskuuta \d{4}\ /);
    await capture('back-order message', cartItem2.section);

    // 9. Verify Back-order flag and shipping schedule of back-order product which its date has ended
    await page.goto(product4.PDPURL);

    // 9. Back-order should display as out of stock when max qty is reached.
    await expect.soft(page.locator('[data-an-la="stock alert"]:visible')).toBeVisible();
    await expect.soft(page.getByText('Sold out. Get stock alert to')).toBeVisible();
    await capture('Back-order should display as out of stock', page);

    // [Cart]
    // 10. Verify Footer
    await page.goto(context.cartURL);
    await cart.waitForLoad();

    // 10. Show Content via AEM/API
    for (let i = 1; i <= 3; i++) {
        await page.evaluate((i) => {
            window.scrollBy(0, window.innerHeight * i);
        }, i);
        await page.waitForTimeout(1000);
        await page.waitForLoadState("domcontentloaded");
    }
    await expect.soft(page.locator('app-footer')).toBeVisible();
    await capture('footer', page);
    // Opphavsrett© 1995-[current year] Samsung. Alle rettigheter forbeholdes.
    await expect.soft(page.getByText('Copyright© 1995-2026 Samsung')).toBeVisible();
    await capture('copyright', page);
    // Accepted payment methods with logo
    await expect.soft(page.locator('.payment-list')).toBeVisible();
    await capture('payment methods', page);

    // 11. Verify RHS summary

    // 11. Display the following section:
    // Totalsub, Total savings
    await expect.soft(cart.rhs.summaryRow('Summa')).toBeVisible();
    await expect.soft(cart.rhs.totalSummary).toBeVisible();
    await capture('total summary', cart.rhs.section);
    // Reward text with tooltip
    await expect.soft(cart.rhs.rewardsBenefit).toBeVisible();
    await expect.soft(cart.rhs.rewardsTooltip).toBeVisible();
    await capture('rewards', cart.rhs.section);

    // 12. Verify bottom of cart page
    // GNB

    // 12. Display Logo Samsung should be redirected to Home page
    // Show GNB correctly via AEM
    await expect.soft(cart.gnb.section).toBeVisible();
    await capture('GNB', cart.gnb.section);
    await page.locator('[alt="Samsung Logo"]').click();
    await expect.soft(page).navigatedTo(context.shopURL);
    await capture('redirected to home page', page);
});
