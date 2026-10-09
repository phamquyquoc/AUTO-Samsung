import type { Page } from 'fixtures';

import GNB from './GNB';

/**
 * Home page (AEM)
 */
export default class Home {
    readonly gnb: GNB;

    constructor(readonly page: Page) {
        this.gnb = new GNB(page);
    }

    get url() {
        return this.page.context().homeURL;
    }
}
