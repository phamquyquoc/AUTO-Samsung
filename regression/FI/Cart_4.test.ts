import { test, expect } from 'fixtures';
import product from 'product';
import { parsePrice } from 'utils';

const title = '[Cart_3] Verify Trade-in in cart page';
const tag = ['@Core'];

test.use({ site: 'FI' });
test.use({ product: product.any.tradeIn.canBuy });

test(title, { tag }, async ({ context, page, cart, profile, capture }) => {
    const product = context.product!;

    // 1. Navigate to Your Cart Page
    await page.goto(context.cartURL);
    await cart.waitForLoad();
    await cart.addToCart(product);
    await capture('added to cart', cart.main);

    // 2. Verify the Trade-in in Cart

    // 2. The Main product with Trade-in should display correctly in Cart page
    await expect(cart).containSKU(product.sku);
    const cartItem = cart.cartItem(product.sku)!;
    await expect(cartItem.tradeIn.section).toBeVisible();
    await capture('trade-in', cartItem.tradeIn.section);

    // 3. Add Trade-in for product in Cart
    const subTotalBefore = await cart.rhs.summaryRow('Summa')!.textContent();
    await cart.addTradeIn(product.sku);
    await capture('trade-in added', cart.main);

    // 3. Subtotal price is not changed after Trade-in added to cart (Trade-in cashback)
    expect.soft(await cart.rhs.summaryRow('Summa')!.textContent()).toBe(subTotalBefore);
    await capture('subtotal price is not changed', cart.rhs.section);
    // - Trade-in value is displayed correctly in bottom of RHS summary
    const tradeInValueText = await cartItem.tradeIn.price.textContent();
    await expect.soft(cart.rhs.section.locator('.trade-in-bonus__right')).toContainText(tradeInValueText!);

    // - Amount that will be refunded after approved exchange (under Subtotal price) = subtotal - Tradein value
    const amountRefundedText = await cart.rhs.section.locator('.tradin-after-cash-back').locator('.cx-summary-amount').textContent();
    expect.soft(parsePrice(amountRefundedText!, 'FI')).toBe(parsePrice(subTotalBefore!, 'FI') - parsePrice(tradeInValueText!, 'FI'));
    await capture('amount refunded', cart.rhs.section);

    // 4. Increase the quantity of Main product > 2. Verify the Trade-in in cart
    await cartItem.increaseQuantityBtn.click();

    // 4. Show remove confirmation pop-up
    await expect.soft(page.getByRole('dialog', { name: 'Vaihto poistetaan' })).toBeVisible();
    // - Click button No / X: back to cart without any change
    await page.getByRole('button', { name: 'Ei', exact: true }).click();
    await expect.soft(page.getByRole('dialog', { name: 'Vakuutus poistetaan' })).toBeHidden();
    // - Click button Yes: Trade-in is removed from cart. Trade-in amount is removed on RHS summary. Show red message under Trade-in section
    await cartItem.increaseQuantityBtn.click();
    await page.getByRole('button', { name: 'Joo' }).click();
    await expect.soft(page.getByRole('dialog', { name: 'Vaihto poistetaan' })).toBeHidden();
    await page.getByText('Tuotteiden määrä on pä').waitFor({ state: 'visible' }).catch();
    await expect.soft(cartItem.tradeIn.removeBtn).toBeHidden();
    await expect.soft(cartItem.section.getByText('Voidaan valita vain, kun')).toBeVisible();
    await capture('trade-in removed', cart.main);

    // 5. Decrease the quantity of Main product to 1
    await cart.decreaseQuantity(product.sku);
    await capture('decrease quantity of Main product to 1', cart.main);

    // 5. Trade-in is available to add to cart
    await expect.soft(cartItem.addTradeInBtn).toBeVisible();
    await capture('trade-in is available to add to cart', cartItem.tradeIn.section);

    // 6. Remove trade-in from Cart
    await cart.addTradeIn(product.sku);
    await cartItem.tradeIn.removeBtn.click();
    await page.getByRole('dialog', { name: 'Vaihto poistetaan' }).waitFor();
    await page.getByRole('button', { name: 'Kyllä' }).click();
    await page.getByRole('dialog', { name: 'Vaihto poistetaan' }).waitFor({ state: 'hidden' });

    // 6. Able to remove trade-in from cart. Trade-in amount is removed on RHS summary.
    await expect.soft(cartItem.tradeIn.removeBtn).toBeHidden();
    await expect.soft(cartItem.addTradeInBtn).toBeVisible();
    await capture('trade-in removed', cartItem.tradeIn.section);

    // 7. Add a Trade-in device with an amount is higher than the main device amount in the cart
    profile.tradeIn = {
        brand: 'Apple',
        device: 'Apple iPhone 16 Pro Max 512GB',
        imei: '353149594207183'
    } as TradeInData;
    // await cart.addTradeIn(product.sku);
    await cartItem.addTradeInBtn.click();
    await expect(cart.tradeIn.modal).toBeVisible({ timeout: 10000 });
    await cart.tradeIn.process(profile.tradeIn);
    await expect(cart.tradeIn.modal).toBeHidden();

    // 7. The cart page shows the errror message
    // NO: Verdien til innbytteenheten kan dessverre ikke overstige prisen på den nye enheten din. Den høyeste verdien som kan legges inn er x kr.
    await expect(page.getByText('Laitteen vaihtohyvitys on liian korkea suhteessa ostoskorisi tuotteiden arvoon, joten se on valitettavasti poistettu.')).toBeVisible();
});
