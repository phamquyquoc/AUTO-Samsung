import { test, expect } from 'fixtures';
import account from 'account';
import product from 'product';

const title = '[Login_2] Login from Splash page as Galaxy ID';
const tag = ['@Core'];

test.use({ site: 'FI' });
test.use({ account: account.any.canReadEmail });
test.use({ product: product.any.hasPD.canBuy });

test(title, { tag }, async ({ context, page, sso, cart, checkout, splash, capture }) => {
    const account = context.account!;
    const product = context.product!

    // 1. Access to FI site as Guest user
    await page.goto(context.homeURL);

    // 2. Add product to cart
    await page.goto(cart.url);
    await cart.waitForLoad();
    await cart.addToCart(product);
    await expect(cart).containSKU(product.sku);
    await capture('Cart Page', cart.main);

    // 3. Go to cart page and click checkout
    await cart.rhs.checkoutBtn.click();
    await expect(page).navigatedTo(context.splashURL);
    await capture('Splash Page');

    // 4. Go to Splash login page
    await splash.signInBtn.click();
    await expect(page).navigatedTo(sso.loginURL);
    await capture('Login Page');

    // 5. Click "login" and verify able to login from Splash page as Galaxy ID
    await sso.accountInput.waitFor();
    await sso.signInByEmail(account.email, account.password);

    // 5. User is able to login from Splash page as Galaxy ID
    await expect(page).navigatedTo(context.checkoutURL);
    await checkout.waitForLoad();
    await capture('Checkout Page');
});
