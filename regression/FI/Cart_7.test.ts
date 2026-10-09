import { test, expect } from 'fixtures';
import product from 'product';

const title = '[Cart_6] Verify Samsung Flex in cart';
const tag = ['@Core'];

test.use({ site: 'FI' });
test.use({ product: product.any.tradeIn.scp.flex.canBuy });
test.use({ product2: product.any.tradeUp.canBuy });

test(title, { tag }, async ({ context, page, cart, capture }) => {
    const product = context.product!;
    const product2 = context.product2!;

    // 1. Access to FI site
    await page.goto(context.cartURL);
    await cart.waitForLoad();

    // 2. Add eligible product to cart
    await cart.addToCart(product);
    await expect(cart).containSKU(product.sku);
    await capture('Add eligible product to cart', cart.main);

    // 3. Verify samsung flex
    const cartItem = cart.cartItem(product.sku);

    // 3. Verify Samsung Flex displayed:
    // Title: Samsung Flex
    // Logo
    // CTA Find out more
    // Add icon
    await expect(cartItem.ssFlex.name).toBeVisible();
    await expect(cartItem.ssFlex.icon).toBeVisible();
    await expect(cartItem.ssFlex.learnMoreLink).toBeVisible();
    await expect(cartItem.ssFlex.section.locator('[data-an-la="add service:samsung flex"]')).toBeVisible();
    await capture('Verify Samsung Flex displayed', cartItem.ssFlex.section);

    // 4. Add EUP to cart
    await cartItem.ssFlex.section.locator('[data-an-la="add service:samsung flex"]').click();
    await expect(page.getByRole('dialog'), 'Flex popup is not visible').toBeVisible();
    await capture('Flex popup');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('dialog'), 'Flex popup is not visible').toBeHidden();
    await expect(cartItem.ssFlex.removeBtn).toBeVisible();
    await capture('Add EUP to cart');

    // 4. Display EUP price as fra XX kr / mnd on cart page
    await expect(cartItem.ssFlex.priceText).toBeVisible();
    await expect(cartItem.ssFlex.priceText).toContainText('fra');
    await expect(cartItem.ssFlex.priceText).toContainText('XX kr / mnd');
    await capture('Display EUP price as fra XX kr / mnd on cart page');

    // 5. Verify combine EUP with other services
    await cart.addToCart(product2);
    await expect(cart).containSKU(product2.sku);
    await capture('Add sku 2 to cart');
    const cartItem2 = cart.cartItem(product2.sku);

    // 5. Can combine EUP with Trade-in/trade-up
    await cart.addTradeIn(product.sku);
    await cart.addTradeUp(product2.sku);
    await expect(cartItem.ssFlex.removeBtn).toBeVisible();
    await expect(cartItem.tradeIn.removeBtn).toBeVisible();
    await expect(cartItem2.tradeUp.removeBtn).toBeVisible();
    await capture('Can combine EUP with Trade-in/trade-up');
    await cartItem.tradeIn.removeBtn.click();
    await expect.soft(page.getByRole('dialog', { name: 'Vaihto poistetaan' })).toBeVisible();
    await page.getByRole('button', { name: 'Ei', exact: true }).click();
    await expect.soft(page.getByRole('dialog', { name: 'Vaihto poistetaan' })).toBeHidden();
    await page.getByText('Tuotteiden määrä on pä').waitFor({ state: 'visible' }).catch();
    await expect.soft(cartItem.tradeIn.removeBtn).toBeHidden();
    await expect.soft(cartItem.tradeIn.section.locator('[data-an-la="add service:trade-in"]')).toBeVisible();
    await capture('Trade-in removed', cart.main);
    await cartItem2.tradeUp.removeBtn.click();
    await expect.soft(page.getByRole('dialog', { name: 'Vaihto poistetaan' })).toBeVisible();
    await page.getByRole('button', { name: 'Ei', exact: true }).click();
    await expect.soft(page.getByRole('dialog', { name: 'Vaihto poistetaan' })).toBeHidden();
    await page.getByText('Tuotteiden määrä on pä').waitFor({ state: 'visible' }).catch();
    await expect.soft(cartItem2.tradeUp.removeBtn).toBeHidden();
    await expect.soft(cartItem2.tradeUp.section.locator('[data-an-la="add service:trade-up"]')).toBeVisible();
    await capture('Trade-up removed', cart.main);

    // Cannot combine EUP with SC+/SIM
    await cart.addSCP(product.sku);
    await expect(cartItem.ssFlex.removeBtn).toBeHidden();
    await expect(cartItem.ssFlex.section.locator('[data-an-la="add service:samsung flex"]')).toBeVisible();
    await capture('Cannot combine EUP with SC+/SIM');

    // 6. Increase the quantity of Main product > 2
    await cartItem.increaseQuantityBtn.click();
    await capture('Increase quantity of Main product > 2');

    // 6. Show remove confirmation pop-up
    await expect.soft(page.getByRole('dialog', { name: 'Vaihto poistetaan' })).toBeVisible();
    // - Click button No / X: back to cart without any change
    await page.getByRole('button', { name: 'Ei', exact: true }).click();
    await expect.soft(page.getByRole('dialog', { name: 'Vakuutus poistetaan' })).toBeHidden();
    // - Click button Yes: EUP is removed from cart. Show red message under EUP section
    await cartItem.increaseQuantityBtn.click();
    await page.getByRole('button', { name: 'Joo' }).click();
    await expect.soft(page.getByRole('dialog', { name: 'Vaihto poistetaan' })).toBeHidden();
    await page.getByText('Tuotteiden määrä on pä').waitFor({ state: 'visible' }).catch();
    await expect.soft(cartItem.ssFlex.removeBtn).toBeHidden();
    await expect.soft(cartItem.ssFlex.section.locator('[data-an-la="add service:samsung flex"]')).toBeVisible();
    await capture('Samsung Flex removed', cart.main);

    // 7. Remove EUP from Cart
    await cart.addFlexUpgradeAPI(product.sku, 0);
    await cartItem.ssFlex.removeBtn.click();
    await expect.soft(page.getByRole('dialog', { name: 'Samsung Flex poistetaan' })).toBeVisible();
    await page.getByRole('button', { name: 'Ei', exact: true }).click();
    await expect.soft(page.getByRole('dialog', { name: 'Samsung Flex poistetaan' })).toBeHidden();
    await page.getByText('Tuotteiden määrä on pä').waitFor({ state: 'visible' }).catch();

    // 7. Able to remove EUP from cart
    await expect.soft(cartItem.ssFlex.removeBtn).toBeHidden();
    await expect.soft(cartItem.ssFlex.section.locator('[data-an-la="add service:samsung flex"]')).toBeVisible();
    await capture('Samsung Flex removed', cart.main);
});
