import { test, expect } from 'fixtures';
import product from 'product';

const title = 'Verify adding/ Editing/ Removing multi services to cart';
const tag = ['@Core'];

test.use({ site: 'FI' });;
test.use({ product: product.any.tradeIn.scp.flex.canBuy });
test.use({ product2: product.any.tradeUp.canBuy });

test(title, { tag }, async ({ context, page, cart, capture }) => {
    const product = context.product!;
    const product2 = context.product2!;

    // 1. Access FI site
    await page.goto(context.cartURL);
    await cart.waitForLoad();

    // 2. Add SC+ / Trade-in /Trade-up/ EUP available product to cart
    await cart.addToCart(product);
    await expect(cart).containSKU(product.sku);
    const cartItem = cart.cartItem(product.sku);

    await cart.addToCart(product2);
    await expect(cart).containSKU(product2.sku);
    const cartItem2 = cart.cartItem(product2.sku);
    await capture('Add eligible product to cart', cart.main);

    // 3. Add mix SMC + Trade-in and Trade-up on cart page
    await cart.addSCP(product.sku);
    await cart.addTradeIn(product.sku);
    await cart.addTradeUp(product2.sku);
    await capture('Add mix SMC + Trade-in and Trade-up on cart page', cart.main);

    // 3. SMC + Trade-in and Trade-up are included successfully. The discount is applied
    await expect(cartItem.scp.removeBtn).toBeVisible();
    await expect(cartItem.tradeIn.removeBtn).toBeVisible();
    await expect(cartItem2.tradeUp.removeBtn).toBeVisible();
    const scpValueText = await cartItem.scp.price.textContent();
    await expect.soft(cart.rhs.summaryRow('Vahinko- ja varkausturva Kuukausittain')!).toContainText(scpValueText!);
    const tradeInValueText = await cartItem.tradeIn.price.textContent();
    await expect.soft(cart.rhs.section.locator('.trade-in-bonus__right')).toContainText(tradeInValueText!);
    const tradeUpValueText = await cartItem2.tradeUp.price.textContent();
    if (await page.locator('.mat-expansion-indicator').isVisible()) {
        await page.locator('.mat-expansion-indicator').click();
    }
    await expect.soft(cart.rhs.summaryRow('Trade Up -hyvitys')!).toContainText(tradeUpValueText!);
    await capture('SMC + Trade-in and Trade-up are included successfully. The discount is applied', cart.main);

    await cartItem.scp.removeBtn.click();
    await page.locator('[data-an-la="remove-item"]').click();
    await expect(cartItem.scp.removeBtn).toBeHidden();
    await cartItem2.tradeUp.removeBtn.click();
    await page.locator('[data-an-la="remove-item"]').click();
    await expect(cartItem2.tradeUp.removeBtn).toBeHidden();
    await capture('SMC and Trade-up removed from cart', cart.main);

    // 4. Add mix Trade-in + EUP on cart page
    await cart.addFlexUpgradeAPI(product.sku, 0);

    // 4. Trade-in + EUP are included successfully. The discount is applied
    await expect(cartItem.tradeIn.removeBtn).toBeVisible();
    await expect(cartItem.ssFlex.removeBtn).toBeVisible();
    await expect.soft(cart.rhs.section.locator('.trade-in-bonus__right')).toContainText(tradeInValueText!);
    const ssFlexValueText = await cartItem.ssFlex.price.textContent();
    await expect.soft(cart.rhs.section.locator('.ss-flex-bonus__right')).toContainText(ssFlexValueText!);
    await capture('Trade-in + EUP are included successfully. The discount is applied', cart.main);

    await cartItem.tradeIn.removeBtn.click();
    await page.locator('[data-an-la="remove-item"]').click();
    await expect(cartItem.tradeIn.removeBtn).toBeHidden();

    // 5. Validate unable to mix SC+ with EUP on cart
    await cart.addSCP(product.sku);

    // 5. Show error message for EUP when adding SC+
    // Show error message for SC+ when adding EUP
    await expect(cartItem.scp.removeBtn).toBeVisible();
    await expect(cartItem.ssFlex.removeBtn).toBeHidden();
    await expect(cartItem.ssFlex.errorMessage).toBeVisible();
    await capture('Show error message for EUP when adding SC+', cart.main);
});
