import assert from 'assert';
import path from 'path';
import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import screenshot, { listDisplays } from 'screenshot-desktop';
import { test as base, expect as baseExpect, Locator, Page } from 'playwright/test';
import { Context, Page as MyPage, TestEnv, testContext } from './context';
import { loginWDS, login, handleCountryModal } from './common';
import { toHaveValues, navigatedTo } from './expect';
import { messages, Errors } from './errors';
import { Account, AccountQuery } from './account';
import { Product, ProductQuery } from './product';
import { Promotion, PromotionQuery } from './promotion';
import { Order, OrderQuery } from './order';

import Backoffice from '../backoffice';
import AddOn from './Addon';
import API from './API';
import ASM from './ASM';
import GNB from './GNB';
import BC from './BC';
import Cart, { AddedService, CartItem } from './Cart';
import Checkout from './Checkout';
import Home from './Home';
import MyOrders from './MyOrders';
import MyReward from './MyReward';
import MyWishlist from 'MyWishlist';
import OrderConfirmation from './OrderConfirmation';
import Payment from './Payment';
import PD from './PD';
import PF from './PF';
import ProfileSettings from './ProfileSettings';
import Splash from './Splash';
import SSO from './SSO';
import { EmailService, Moakt, Webmail } from './Email';
import HAC from '../hac/hac';

export type { Context, MyPage as Page, Locator };

export type TestArgs = TestEnv & {
    accounts: Account[];
    account?: AccountQuery;

    products: Product[];
    product?: ProductQuery;
    product2?: ProductQuery;
    product3?: ProductQuery;
    product4?: ProductQuery;
    product5?: ProductQuery;

    promotions: Promotion[];
    promotion?: PromotionQuery;
    promotion2?: PromotionQuery;
    promotion3?: PromotionQuery;
    promotion4?: PromotionQuery;
    promotion5?: PromotionQuery;
    promotion6?: PromotionQuery;

    orders: Order[];
    order?: OrderQuery;
}

export type Fixtures = {
    context: Context;
    page: MyPage;
    api: API;
    asm: ASM;
    bo: Backoffice;
    sso: SSO;
    home: Home;
    gnb: GNB;
    bc: BC;
    addOn: AddOn;
    pd: PD;
    pf: PF;
    cart: Cart;
    splash: Splash;
    checkout: Checkout;
    payment: Payment;
    orderConfirmation: OrderConfirmation;
    myOrders: MyOrders;
    myReward: MyReward;
    myWishlist: MyWishlist;
    profileSettings: ProfileSettings;
    email: EmailService;
    hac: HAC;

    errors: Errors;
    capture(name: string, area?: Locator | Page, options?: { top?: number, bottom?: number }): Promise<Buffer>;
}

const noop = () => { };

function createDataProxy(data: any, write: () => void) {
    return new Proxy(data, {
        get(target, prop) {
            const value = Reflect.get(target, prop);
            if (value && typeof value === "object") {
                return createDataProxy(value, write);
            }
            return value;
        },
        set(target, prop, value) {
            Reflect.set(target, prop, value);
            write();
            return true;
        }
    });
}

export const test = base.extend<TestArgs & Fixtures>({
    site: [process.env.SITE!, { option: true }],
    env: ['stg2', { option: true }],
    envAEM: ['p6-pre-qa2', { option: true }],
    asRegistered: [false, { option: true }],
    boInfo: [{ account: 'Automation_Reg' }, { option: true }],
    workingDir: [undefined, { option: true }],

    account: [undefined, { option: true }],
    product: [undefined, { option: true }],
    product2: [undefined, { option: true }],
    product3: [undefined, { option: true }],
    product4: [undefined, { option: true }],
    product5: [undefined, { option: true }],
    promotion: [undefined, { option: true }],
    promotion2: [undefined, { option: true }],
    promotion3: [undefined, { option: true }],
    promotion4: [undefined, { option: true }],
    promotion5: [undefined, { option: true }],
    promotion6: [undefined, { option: true }],
    order: [undefined, { option: true }],

    accounts: async ({ env, workingDir }, use) => {
        const dir = workingDir || path.dirname(base.info().file);
        const file = path.join(dir, env == 'prod' ? 'prod_accounts.json' : 'accounts.json');
        const data = existsSync(file) ? require(file) : [];
        const accounts = createDataProxy(data, () => writeFileSync(file, JSON.stringify(data, null, 2)));
        await use(accounts);
    },

    products: async ({ env, workingDir }, use) => {
        const dir = workingDir || path.dirname(base.info().file);
        const file = path.join(dir, `${env}_products.json`);
        const data = existsSync(file) ? require(file) : [];
        const products = createDataProxy(data, () => writeFileSync(file, JSON.stringify(data, null, 2)));
        await use(products);
    },

    promotions: async ({ env, workingDir, accounts, products }, use) => {
        const dir = workingDir || path.dirname(base.info().file);
        const file = path.join(dir, `${env}_promotions.json`);
        const data = existsSync(file) ? require(file) : [];
        const mapped = data.map(({ account, product, product2, product3, ...other }: any) => ({
            ...other,
            account: account ? accounts.find(a => a.email == account) : undefined,
            product: product ? products.find(p => p.sku == product) || { sku: product } : undefined,
            product2: product2 ? products.find(p => p.sku == product2) || { sku: product2 } : undefined,
            product3: product3 ? products.find(p => p.sku == product3) || { sku: product3 } : undefined
        }));
        const promotions = createDataProxy(mapped, () => writeFileSync(file, JSON.stringify(mapped.map(({ account, product, product2, product3, ...other }: any) => ({
            ...other,
            account: account?.email || account,
            product: product?.sku || product,
            product2: product2?.sku || product2,
            product3: product3?.sku || product3
        })), null, 2)));
        await use(promotions);
    },

    orders: async ({ env, workingDir, accounts, products }, use) => {
        const dir = workingDir || path.dirname(base.info().file);
        const file = path.join(dir, `${env}_orders.json`);
        const data = existsSync(file) ? require(file) : [];
        const mapped = data.map(({ account, products: skus, ...other }: any) => ({
            ...other,
            account: account ? accounts.find(a => a.email == account) : undefined,
            products: skus ? skus.map((sku: string) => products.find(p => p.sku == sku) || { sku }) : []
        }));
        const orders = createDataProxy(mapped, () => writeFileSync(file, JSON.stringify(mapped.map(({ account, products, ...other }: any) => ({
            ...other,
            account: account?.email || account,
            products: products?.filter((p: any) => typeof p === 'object').map((p: any) => p.sku || p)
        })), null, 2)));
        await use(orders);
    },

    profile: [async ({ site, env, workingDir }, use) => {
        const profile = require(`../data/${site.toUpperCase()}.json`);
        const file = path.join(workingDir || path.dirname(base.info().file), `${env}_data.json`);
        if (existsSync(file)) {
            Object.assign(profile, require(file));
        }
        await use(profile);
    }, { box: true }],

    envConfig: [async ({ env, workingDir }, use) => {
        const file = path.join(workingDir || path.dirname(base.info().file), `${env}_config.json`);
        const data = existsSync(file) ? require(file) : {};
        const config = createDataProxy(data, () => writeFileSync(file, JSON.stringify(data, null, 2)));
        await use(config);
    }, { box: true }],

    storageState: async ({ asRegistered, accounts, account, workingDir }, use) => {
        if (!asRegistered) return await use(undefined);
        const user = account?.findOne(accounts) || accounts[0];
        assert(user, 'No account found');
        const id = user.email.replaceAll(/[^\w]/g, '_').toLowerCase();
        const filename = path.join(workingDir || path.dirname(base.info().file), '.auth', id + '.json');
        await use(existsSync(filename) ? filename : undefined);
    },

    playwright: [async ({ playwright }, use) => {
        await playwright.selectors.register('code', () => ({
            queryAll(root: HTMLElement, code: string) {
                return Array.from(root.querySelectorAll('label')).filter(
                    label => label.htmlFor.replace(/^group\d+/, '').toLowerCase() === code.toLowerCase()
                );
            }
        }));
        await playwright.selectors.register('type', () => ({
            queryAll(root: HTMLElement) {
                let modal;
                let zIndex = -1;
                root.querySelectorAll<HTMLDivElement>('.z-window-shadow').forEach(elm => {
                    const z = parseInt(elm.style.zIndex || '0');
                    if (z > zIndex) {
                        zIndex = z;
                        modal = elm;
                    }
                });
                return modal ? [modal] : [];
            }
        }));
        await use(playwright);
    }, { scope: 'worker' }],

    context: async ({
        context, site, env, envAEM, profile, asRegistered, workingDir, envConfig, boInfo,
        accounts, products, promotions, orders,
        account, product, product2, product3, product4, product5,
        promotion, promotion2, promotion3, promotion4, promotion5, promotion6,
        order,
    }, use) => {
        const acc = account?.findOne(accounts) || (asRegistered ? accounts[0] : undefined);
        // Rows without a voucher share an empty code, so a taken row is excluded by identity first.
        const free = (...taken: (Promotion | undefined)[]) =>
            (p: Promotion) => !taken.includes(p) && !taken.some(t => t?.code && t.code === p.code);
        const promo1 = await promotion?.findOne(promotions);
        const promo2 = await promotion2?.findOne(promotions.filter(free(promo1)));
        const promo3 = await promotion3?.findOne(promotions.filter(free(promo1, promo2)));
        const promo4 = await promotion4?.findOne(promotions.filter(free(promo1, promo2, promo3)));
        const promo5 = await promotion5?.findOne(promotions.filter(free(promo1, promo2, promo3, promo4)));
        const promo6 = await promotion6?.findOne(promotions.filter(free(promo1, promo2, promo3, promo4, promo5)));
        const promoProducts = [
            promo1?.product?.sku, promo1?.product2?.sku, promo1?.product3?.sku,
            promo2?.product?.sku, promo2?.product2?.sku, promo2?.product3?.sku,
            promo3?.product?.sku, promo3?.product2?.sku, promo3?.product3?.sku,
            promo4?.product?.sku, promo4?.product2?.sku, promo4?.product3?.sku,
            promo5?.product?.sku, promo5?.product2?.sku, promo5?.product3?.sku,
            promo6?.product?.sku, promo6?.product2?.sku, promo6?.product3?.sku,
        ].filter(Boolean);
        const prod1 = await product?.findOne(products.filter(p => !promoProducts.includes(p.sku)));
        const prod2 = await product2?.findOne(products.filter(p => ![prod1?.sku, ...promoProducts].includes(p.sku)));
        const prod3 = await product3?.findOne(products.filter(p => ![prod1?.sku, prod2?.sku, ...promoProducts].includes(p.sku)));
        const prod4 = await product4?.findOne(products.filter(p => ![prod1?.sku, prod2?.sku, prod3?.sku, ...promoProducts].includes(p.sku)));
        const prod5 = await product5?.findOne(products.filter(p => ![prod1?.sku, prod2?.sku, prod3?.sku, prod4?.sku, ...promoProducts].includes(p.sku)));
        const ord = await order?.findOne(orders);
        Object.defineProperties(context, Object.getOwnPropertyDescriptors(testContext({
            site,
            env,
            envAEM,
            profile,
            asRegistered,
            workingDir,
            envConfig,
            boInfo,
            account: acc,
            product: prod1,
            product2: prod2,
            product3: prod3,
            product4: prod4,
            product5: prod5,
            promotion: promo1,
            promotion2: promo2,
            promotion3: promo3,
            promotion4: promo4,
            promotion5: promo5,
            promotion6: promo6,
            order: ord,
            checkoutEmail: 'autotest@wisewires.com'
        })));
        await use(context);
    },

    page: async ({ context, page }, use) => {
        const goto = page.goto.bind(page);
        let locatorHandlerAdded = false;
        page.goto = async (url: string, options?: Parameters<Page['goto']>[1]) => {
            const { env, envAEM, profile, homeURL, shopURL, cartURL } = context;
            const isCA = context.site.toUpperCase() === 'CA';
            if (context.asRegistered && !context.ssoSignedIn) {
                const preferFrom = profile.preferLoginFrom?.toLowerCase().trim();
                if (preferFrom == 'home' && !url.startsWith(homeURL)) {
                    await page.goto(homeURL);
                    return page.goto(url);
                }
                if (['shop', 'cart'].includes(preferFrom!) && !url.startsWith(shopURL)) {
                    await page.goto(preferFrom == 'shop' ? shopURL : cartURL);
                    return page.goto(url);
                }
            }
            if (env != 'prod' && !context.cookieRequested) {
                await goto(context.cookieURL);
                await page.waitForTimeout(1000);
                context.cookieRequested = true;
            }
            if (url.includes('backoffice')) return isCA ? goto(url, options) : goto(url);
            if (url.includes('hshopfront.samsung.com')) return isCA ? goto(url, options) : goto(url);
            const isAEM = url.startsWith('https://p6-');
            const enterAEM = async () => {
                await goto('https://wds.samsung.com');
                // Site folder may export loginWDS (e.g. CN → China(QA) Preqa2), same override style as Cart.ts / Payment.ts.
                const siteCommonPath = path.join(path.dirname(base.info().file), 'common.ts');
                const siteLoginWDS = existsSync(siteCommonPath)
                    ? require(siteCommonPath).loginWDS as typeof loginWDS | undefined
                    : undefined;
                await (siteLoginWDS || loginWDS)(page, envAEM);
                context.wdsReady = true;
                // Alternate AEM origin (CN .com.cn): warm session before pointing.
                const aemOrigin = context.profile.aemDomains?.[envAEM];
                if (aemOrigin) {
                    await goto(aemOrigin.replace(/\/$/, '') + '/');
                    await page.waitForTimeout(2000);
                }
                if (envAEM == 'p6-pre-qa2' && !context.pointingRequested) {
                    await goto(context.pointingURL);
                    await page.getByText('"SUCCESS"').waitFor({ timeout: 30000 }).catch(() => {
                        throw new Error('Failed to request pointing URL')
                    });
                    await page.waitForTimeout(1000);
                    context.pointingRequested = true;
                }
            };
            if (isAEM && !context.wdsReady) {
                await enterAEM();
            }
            const gotoWithConsent = async () => {
                // CA TrustArc can block `load`; other sites keep the previous default.
                const nav = isCA
                    ? (isAEM ? { waitUntil: 'domcontentloaded' as const, ...options } : options)
                    : undefined;
                if (context.profile.cluster.startsWith('SMN') && !context.profile.noConsent) {
                    const consentResponse = page.waitForResponse('https://consent.trustarc.com/notice*', { timeout: 30000 }).catch(() => { });
                    const response = await goto(url, nav);
                    await consentResponse;
                    return response;
                }
                return goto(url, nav);
            };
            let res = await gotoWithConsent();
            // The AEM session expires on its own, and wdsReady would otherwise keep us from logging
            // in again - every later goto lands on "Please login through WMC" for the rest of the test.
            if (isAEM && /\/login\/content\/login\.html|j_reason=session_timed_out/.test(page.url())) {
                console.log('AEM session expired, logging in to WDS again');
                context.pointingRequested = false;
                await enterAEM();
                res = await gotoWithConsent();
            }
            await page.locator('#truste-consent-button:visible, [an-la="cookie bar:accept"]:visible')
                .click({ timeout: isCA ? 500 : 3000 })
                .then(async () => {
                    if (isCA) return;
                    await page.waitForTimeout(2000);
                    await page.waitForLoadState();
                })
                .catch(noop);
            if (!locatorHandlerAdded) {
                await page.addLocatorHandler(
                    page.locator('#truste-consent-track:visible, .cookie-bar:visible'),
                    (l) => l.locator('#truste-consent-button, [an-la="cookie bar:accept"]').click().catch(noop)
                ).catch(noop);
                await page.addLocatorHandler(
                    page.locator('app-country-selector-modal:visible'),
                    (modal) => handleCountryModal(modal).catch(noop)
                ).catch(noop);
                await page.addLocatorHandler(
                    page.locator('[class*="ins-custom-cart-reminder-container"]'),
                    (l) => l.evaluate((e: any) => e.querySelector('[class*="ins-close-button"]').click()).catch(noop)
                );
                locatorHandlerAdded = true;
            }
            await page.addStyleTag({ content: '.ins-preview-wrapper { display: none; }' }).catch(noop);
            if (context.asRegistered && !context.ssoSignedIn) {
                await login(page);
            }
            return res;
        };
        await use(page);
    },

    api: async ({ page }, use) => {
        await use(new API(page));
    },

    asm: async ({ page }, use) => {
        await use(new ASM(page));
    },

    bo: async ({ browser, context }, use) => {
        const boContext = await browser.newContext();
        Object.defineProperties(boContext, Object.getOwnPropertyDescriptors(context));
        const boPage = await boContext.newPage();
        await use(new Backoffice(boPage as unknown as MyPage));
        await boContext.close();
    },

    sso: async ({ page }, use) => {
        await use(new SSO(page));
    },

    home: async ({ page }, use) => {
        await use(new Home(page));
    },

    gnb: async ({ page }, use) => {
        await use(new GNB(page));
    },

    bc: async ({ page }, use) => {
        const filePath = path.join(path.dirname(base.info().file), 'BC.ts');
        const BCImpl: typeof BC = existsSync(filePath) ? require(filePath).default : BC;
        await use(new BCImpl(page));
    },

    addOn: async ({ page }, use) => {
        await use(new AddOn(page));
    },

    pd: async ({ page }, use) => {
        const filePath = path.join(path.dirname(base.info().file), 'PD.ts');
        const PDImpl: typeof PD = existsSync(filePath) ? require(filePath).default : PD;
        await use(new PDImpl(page));
    },

    pf: async ({ page }, use) => {
        await use(new PF(page));
    },

    cart: async ({ page }, use) => {
        const filePath = path.join(path.dirname(base.info().file), 'Cart.ts');
        const CartImpl: typeof Cart = existsSync(filePath) ? require(filePath).default : Cart;
        await use(new CartImpl(page));
    },

    splash: async ({ page }, use) => {
        await use(new Splash(page));
    },

    checkout: async ({ page }, use) => {
        const filePath = path.join(path.dirname(base.info().file), 'Checkout.ts');
        const CheckoutImpl: typeof Checkout = existsSync(filePath) ? require(filePath).default : Checkout;
        await use(new CheckoutImpl(page));
    },

    payment: async ({ page }, use) => {
        const filePath = path.join(path.dirname(base.info().file), 'Payment.ts');
        const PaymentImpl: typeof Payment = existsSync(filePath) ? require(filePath).default : Payment;
        await use(new PaymentImpl(page));
    },

    orderConfirmation: async ({ page }, use) => {
        const filePath = path.join(path.dirname(base.info().file), 'OrderConfirmation.ts');
        const OrderConfirmationImpl: typeof OrderConfirmation = existsSync(filePath) ? require(filePath).default : OrderConfirmation;
        await use(new OrderConfirmationImpl(page));
    },

    myOrders: async ({ page }, use) => {
        await use(new MyOrders(page));
    },

    myReward: async ({ page }, use) => {
        await use(new MyReward(page));
    },

    myWishlist: async ({ page }, use) => {
        await use(new MyWishlist(page));
    },

    profileSettings: async ({ page }, use) => {
        await use(new ProfileSettings(page));
    },

    email: async ({ context, accounts, account }, use) => {
        assert(context.account || context.order?.account || account, 'Account is required to create email service');
        const acc = context.account || context.order?.account || account?.findOne(accounts)!;
        assert(acc.emailInbox?.url, 'Account email inbox URL is required');
        if (acc.emailInbox?.url.includes('webmail.wisewires.com')) {
            const filePath = path.join(path.dirname(base.info().file), 'Email.ts');
            const WebmailImpl: typeof Webmail = existsSync(filePath) ? require(filePath).default : Webmail;
            await use(new WebmailImpl(acc.emailInbox.email, acc.emailInbox.password!));
        } else if (acc.emailInbox.url.includes('moakt.com')) {
            await use(new Moakt(acc.emailInbox.email));
        } else {
            throw new Error('Unsupported email inbox URL');
        }
    },

    hac: async ({ context }, use) => {
        await use(new HAC(context));
    },

    errors: async ({ env, workingDir }, use) => {
        const errorsFile = path.join(workingDir || path.dirname(base.info().file), 'errors.json');
        const issuesFile = path.join(workingDir || path.dirname(base.info().file), `${env}_issues.json`);
        const errors = existsSync(errorsFile) ? require(errorsFile) : {};
        const issues = existsSync(issuesFile) ? require(issuesFile) : {};
        const proxy = new Proxy({ ...messages, errors, ...issues }, {
            get(target, prop) {
                return target[prop as keyof Errors] || prop;
            }
        });
        await use(proxy);
    },

    capture: async ({ page, isMobile }, use) => {
        const getHeight = (locator: Locator) => locator.filter({ visible: true }).evaluateAll(elms => {
            const top = Math.min(...elms.map(e => e.getBoundingClientRect().top));
            const bottom = Math.max(...elms.map(e => e.getBoundingClientRect().bottom));
            return bottom - top;
        });
        async function captureFn(name: string, area?: Locator | Page, options?: { top?: number, bottom?: number }) {
            let locator = typeof (area as any)?.page == 'function' ? area as Locator : undefined;
            const p = locator?.page() || (area as Page) || page;
            let cssElm;
            let originalZoom: string | undefined;
            try {
                const css = '#consent_blackbar, #truste-consent-track, app-country-selector-modal {display:none}';
                cssElm = await p.addStyleTag({ content: css });
                const outputPath = test.info().outputPath(`${name}.jpg`);
                if (isMobile) {
                    const buffer = await p.screenshot({ path: outputPath, type: 'jpeg' });
                    await test.info().attach(name, { body: buffer, contentType: 'image/jpeg' });
                    return buffer;
                }
                if (locator) {
                    originalZoom = await p.evaluate(() => document.body.style.zoom || '100%');
                    const top = options?.top || 24;
                    const bottom = options?.bottom || 24;
                    const height = await getHeight(locator) + top + bottom;
                    const innerHeight = await p.evaluate(() => window.innerHeight);
                    if (height < innerHeight) {
                        const o = (innerHeight - height) / 2 + top;
                        await locator.filter({ visible: true }).first().evaluate((e, o) => window.scrollBy({ top: e.getBoundingClientRect().top - o, behavior: 'instant' }), o);
                    } else {
                        const z = Math.floor(100 * innerHeight / height);
                        const o = z * top / 100;
                        await p.evaluate(() => {
                            const w = window as any;
                            w._ww_e1_ = document.querySelectorAll('.trade-in-popup-v3 .scrollbar__wrap[style*="max-height"]');
                            w._ww_s1_ = w._ww_e1_[0]?.getAttribute('style');
                            w._ww_e1_.forEach((e: HTMLElement) => e.setAttribute('style', ''));
                        });
                        await p.evaluate(z => document.body.style.zoom = z + '%', z);
                        await locator.filter({ visible: true }).first().evaluate((e, o) => window.scrollBy({ top: e.getBoundingClientRect().top - o, behavior: 'instant' }), o);
                    }
                }
                let buffer: Buffer;
                if (process.env.SCREENSHOT_SCREEN) {
                    const title = await p.title();
                    const windowID = 'Auto-' + Date.now();
                    const tool = path.join(__dirname, '../auto.exe');
                    for (let i = 0; i < 3; i++) {
                        try {
                            await p.bringToFront();
                            await p.evaluate(t => window.document.title = t, windowID);
                            await p.waitForTimeout(1000);
                            const stdout = execSync(`"${tool}" "${windowID} - Chromium"`).toString('utf-8');
                            if (!stdout.includes('Bringing to foreground')) throw new Error(stdout);
                            break;
                        } catch (e) {
                            if (i == 2) throw e;
                        }
                    }
                    await p.evaluate(t => window.document.title = t, title);
                    await p.waitForTimeout(1000);
                    const screenIdx = parseInt(process.env.SCREENSHOT_SCREEN!);
                    buffer = await screenshot({ format: 'jpg', screen: screenIdx ? (await listDisplays())[screenIdx - 1].id : undefined });
                } else {
                    buffer = await p.screenshot({ path: outputPath, type: 'jpeg' });
                }
                await test.info().attach(name, { body: buffer, contentType: 'image/jpeg' });
                return buffer;
            } finally {
                await p.evaluate(z => z && (document.body.style.zoom = z), originalZoom);
                await p.evaluate(() => { const w = window as any; w._ww_e1_?.forEach((e: HTMLElement) => e.setAttribute('style', w._ww_s1_)) });
                await cssElm?.evaluate(e => document.head.removeChild(e));
            }
        }
        await use(captureFn);
    },
});

export const expect = baseExpect.extend({
    containSKU: Cart.containSKU,
    toHaveQuantity: CartItem.toHaveQuantity,
    toBeAdded: AddedService.toBeAdded,
    toHaveValues,
    navigatedTo,
});
