import { Locator } from 'playwright';
import { Page } from 'context';
import Form, { FormField } from 'Form';

export class ShareCart extends Form {
    readonly email: FormField;
    readonly message: FormField;
    readonly cancelBtn: Locator;
    readonly shareBtn: Locator;

    constructor(readonly popup: Locator) {
        super(popup);
        this.email = this.field('email');
        this.message = this.field('asmMessage');
        this.cancelBtn = popup.locator('[data-an-la="share basket popup:close"]:not(.modal__close):visible');
        this.shareBtn = popup.locator('[data-an-la="share basket popup:apply"]');
    }
}

export class Compensation extends Form {
    readonly reasonCode: FormField;
    readonly relatedOrderCode: FormField;
    readonly mainProductCode: FormField;
    readonly submitBtn: Locator;

    constructor(readonly form: Locator) {
        super(form);
        this.reasonCode = this.field('compensationReasonCode');
        this.relatedOrderCode = this.field('compensationRelatedOrderCode');
        this.mainProductCode = this.field('compensationMainProductCode');
        this.submitBtn = form.locator('.compensation-form__button');
    }
}

class ASM {
    readonly section: Locator;
    readonly agentID: Locator;
    readonly password: Locator;
    readonly signInBtn: Locator;
    readonly signOutBtn: Locator;

    constructor(readonly page: Page) {
        this.section = page.locator('cx-asm-main-ui');
        this.agentID = this.section.locator('[formcontrolname="userId"]');
        this.password = this.section.locator('[formcontrolname="password"]');
        this.signInBtn = this.section.locator('[type="submit"]')
        this.signOutBtn = this.section.locator('.logout');
    }

    async login(account: string, password: string) {
        await this.section.waitFor();
        await this.agentID.fill(account);
        await this.password.fill(password);
        await this.signInBtn.click();
        await this.signOutBtn.waitFor();
    }

    async logout() {
        await this.signOutBtn.click();
        await this.signInBtn.waitFor();
    }
}

export default ASM;
