import { expect, ExpectMatcherState, MatcherReturnType, Page } from 'playwright/test';
import Form from 'Form';

type Options = {
    timeout?: number;
}

export async function navigatedTo(this: ExpectMatcherState, page: Page, url: string, options?: Options): Promise<MatcherReturnType> {
    try {
        const uri = new URL(url);
        await page.waitForURL(({ protocol, host, pathname }) => {
            return protocol == uri.protocol && host == uri.host && pathname.replace(/\/$/, '') == uri.pathname.replace(/\/$/, '')
        }, { timeout: 60000, ...options });
        return { pass: true, message: () => `Navigated to ${url}` };
    } catch (e: any) {
        return {
            pass: false,
            message: () => this.utils.matcherHint('navigatedTo', 'Page', undefined) + '\n' +
                'Expected: ' + this.utils.printExpected(url) + '\n' +
                'Actual: ' + this.utils.printReceived(page.url())
        };
    }
}

export async function toHaveValues(this: ExpectMatcherState, form: Form, values: string[], options?: Options): Promise<MatcherReturnType> {
    try {
        await expect.poll(() => Form.getValues(form), options).toEqual(expect.arrayContaining(values));
        return { pass: true, message: () => `Form field values are ${values}` };
    } catch (e: any) {
        const actual = await Form.getValues(form);
        return {
            pass: false,
            message: () => this.utils.matcherHint('toHaveValues', 'Form', undefined) + '\n' +
                'Expected: ' + this.utils.printExpected(values) + '\n' +
                'Actual: ' + this.utils.printReceived(actual)
        };
    }
}
