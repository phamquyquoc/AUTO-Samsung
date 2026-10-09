import { test, expect } from 'fixtures';
import product from 'product';
import { parsePrice } from 'utils';

const title = '[Cart_2] Verify SC+ in cart page';
const tag = ['@Core'];

test.use({ site: 'FI' });
test.use({ product: product.any.scp.canBuy });
test.use({ product2: product.any.scp.canBuy });

test(title, { tag }, async ({ context, page, cart, capture }) => {
    const product = context.product!;
    const product2 = context.product2!;

    // 1. Navigate to Your Cart Page
    await page.goto(context.cartURL);
    await cart.waitForLoad();
    await cart.addToCart(product);

    await capture('item-on-cart', cart.main);
    await expect.soft(cart).containSKU(product.sku);

    // 2. Verify the SC+ in Cart
    const cartItem1 = cart.cartItem(product.sku)!;
    const product1Price = parsePrice(await cartItem1.currentPrice.innerText()!, 'fi');

    // 2. The Main product with SC+ should display correctly in Cart page
    await expect.soft(cartItem1.scp.section).toBeVisible();
    await capture('SC+', cartItem1.scp.section);

    // 3. Add SC+ for product in Cart
    await cartItem1.addSCPBtn.click();
    await expect.soft(cart.scp.modal).toBeVisible();
    await expect.soft(cart.scp.title).toHaveText('Samsung Care+');
    const optionOfSKU1 = cart.scp.option({ hasNotText: 'Undefined' });
    const smcNameOfSKU1 = await optionOfSKU1.name.innerText();
    const smcPriceOfSKU1 = await optionOfSKU1.priceText.innerText();
    await optionOfSKU1.click();
    await cart.scp.confirmBtn.click();
    await expect.soft(cart.scp.modal).toBeHidden();

    // 3.1. SC+ added to cart.
    // - SC+ price should be included in Subtotal price
    await expect.soft(cartItem1.scp.removeBtn).toBeVisible();
    await expect.soft(cartItem1.scp.name).toBeVisible();
    await expect.soft(cart.rhs.summaryRow(smcNameOfSKU1!)).toBeVisible();
    await expect.soft(cart.rhs.summaryRowAmount(smcNameOfSKU1!)).toHaveText(smcPriceOfSKU1!);
    await capture('SC+ added to cart', cart.rhs.section);

    // 3.2. Able to add multiple SC+ on multiple SKUs
    await cart.addToCart(product2);
    const cartItem2 = cart.cartItem(product2.sku)!;
    const product2Price = parsePrice(await cartItem2.currentPrice.innerText()!, 'fi');
    await cartItem2.addSCPBtn.click();
    await expect.soft(cart.scp.modal).toBeVisible();
    await expect.soft(cart.scp.title).toHaveText('Samsung Care+');
    const optionOfSKU2 = cart.scp.option({ hasNotText: 'Undefined' });
    const smcNameOfSKU2 = await optionOfSKU2.name.innerText();
    const smcPriceOfSKU2 = await optionOfSKU2.priceText.innerText();
    await optionOfSKU2.click();
    await cart.scp.confirmBtn.click();
    await expect.soft(cart.scp.modal).toBeHidden();
    await expect.soft(cartItem2.scp.section).toBeVisible();
    await capture('Multiple SC+ added to cart', cartItem2.scp.section);

    // 4. Increase the quantity of Main product > 2. Verify the SC+ in cart
    await cartItem1.increaseQuantityBtn.click();

    // 4. Show remove confirmation pop-up
    await expect.soft(page.getByRole('dialog', { name: 'Vakuutus poistetaan' })).toBeVisible();
    await capture('remove confirmation pop-up', page);
    // - Click button No / X: back to cart without any change
    await page.getByRole('button', { name: 'Ei' }).click();
    await expect.soft(page.getByRole('dialog', { name: 'Vakuutus poistetaan' })).toBeHidden();
    await capture('back to cart without any change', page);
    // - Click button Yes: SC+ is removed from cart. Total saving, Subtotal price should be updated accordingly. Show red message under SC+ section
    await cartItem1.increaseQuantityBtn.click();
    await page.getByRole('button', { name: 'Joo' }).click();
    await expect.soft(page.getByRole('dialog', { name: 'Vakuutus poistetaan' })).toBeHidden();
    await page.getByText('Tuotteiden määrä on pä').waitFor({ state: 'visible' }).catch();
    await expect.soft(cartItem1.scp.removeBtn).toBeHidden();
    await expect.soft(cartItem1.addSCPBtn).toBeHidden();
    const cartTotalPriceAfter = await cart.rhs.getTotalAmount('fi');
    expect.soft(cartTotalPriceAfter).toBe(product1Price * 2 + product2Price + parsePrice(smcPriceOfSKU2!, 'fi'));
    await expect.soft(cartItem1.scp.errorMessage).toBeVisible();
    await capture('SC+ removed from cart', cartItem1.scp.section);

    // 5. Decrease the quantity of Main product to 1
    await cart.decreaseQuantity(product.sku);
    await capture('decrease quantity of Main product to 1', cart.main);

    // 5. SC+ is available to add to cart
    await expect.soft(cartItem1.addSCPBtn).toBeVisible();
    await capture('SC+ is available to add to cart', cartItem1.scp.section);

    // 6. Remove SC+ from Cart
    await cartItem2.scp.removeBtn.click();
    await page.getByRole('dialog', { name: 'Vakuutus poistetaan' }).waitFor();
    await page.getByRole('button', { name: 'Kyllä' }).click();
    await page.getByRole('dialog', { name: 'Vakuutus poistetaan' }).waitFor({ state: 'hidden' });

    // 6. Able to remove SC+ from cart. Total saving, Subtotal price should be updated accordingly
    await expect.soft(cartItem2.scp.removeBtn).toBeHidden();
    await expect.soft(cartItem2.addSCPBtn).toBeVisible();
    await expect.soft(cart.rhs.summaryRow(smcNameOfSKU2!)).toBeHidden();
    await expect.soft(cart.rhs.summaryRowAmount(smcNameOfSKU2!)).toBeHidden();
    const cartTotalPriceAfter2 = await cart.rhs.getTotalAmount('fi');
    expect.soft(cartTotalPriceAfter2).toBe(product1Price + product2Price);
    await capture('SC+ removed from cart', cartItem2.scp.section);
});
