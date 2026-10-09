import { Page } from 'context';
import { expect, Locator, test } from 'fixtures';

export type SearchOptions = {
    skipBefore?: Date;
    timeout?: number;
    subjectMatch?: string | RegExp;
};

export interface EmailService {
    emailBody: Locator;
    attachments: Locator;
    open(page: Page): Promise<void>;
    search(query: string, options?: SearchOptions): Promise<void>;
    openMail(subject: string | RegExp): Promise<void>;
    getOTP(): Promise<string>;
    downloadAttachment(filename: string | RegExp): Promise<string>;
}

export class Moakt implements EmailService {
    private page: Page | undefined;
    readonly email: string;

    constructor(email: string) {
        this.email = email;
    }

    get emailBody(): Locator {
        return this.page!.locator('.email-body');
    }

    get attachments(): Locator {
        return this.page!.locator('.message-attachments li');
    }

    async open(page: Page): Promise<void> {
        this.page = page;
        if (!page.url().includes('moakt.com')) {
            await page.goto('https://moakt.com');
        }
        const [localPart, domain] = this.email.split('@');
        const address = page.locator('#email-address');
        const nameInput = page.getByPlaceholder('your mail name !');
        const createBtn = page.getByRole('button', { name: /Submit|Create|생성/ }).filter({ hasNotText: /Random|임의/ });
        const pencil = page.locator('#inline-edit-btn');
        await nameInput.or(pencil).waitFor();
        if (await nameInput.isVisible()) {
            const domainSelect = page.locator('select').filter({ has: page.locator(`option[value="${domain}"]`) });
            await domainSelect.selectOption(domain);
            await expect(domainSelect).toHaveValue(domain);
            await nameInput.fill(localPart);
            await domainSelect.selectOption(domain);
            await createBtn.last().click();
            await page.waitForTimeout(1000);
            if (await page.getByText(/currently in use|현재 사용/i).isVisible().catch(() => false)) {
                await nameInput.fill(`tmp${Date.now()}`);
                await domainSelect.selectOption(domain);
                await createBtn.last().click();
            }
        }
        await pencil.waitFor({ state: 'visible', timeout: 20000 });
        const shown = (await address.innerText()).trim();
        if (!shown.includes(localPart) || (domain && !shown.toLowerCase().includes(domain.toLowerCase()))) {
            await pencil.scrollIntoViewIfNeeded();
            const box = await pencil.boundingBox();
            if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
            const editInput = page.locator('#newEmail');
            if (!await editInput.isVisible().catch(() => false)) {
                await pencil.click({ force: true });
            }
            await editInput.waitFor({ state: 'visible', timeout: 10000 });
            await editInput.fill(localPart);
            await page.locator('.inline-edit-save').click();
        }
        await expect(address).toContainText(this.email, { timeout: 20000 });
        await page.bringToFront();
    }

    async search(query: string, options?: SearchOptions): Promise<void> {
        const { subjectMatch, timeout } = Object.assign({ timeout: 120000 }, options);
        console.log('Searching for email:', query);
        const back = this.page!.getByRole('link', { name: /Go back/i });
        if (await back.isVisible().catch(() => false)) {
            await back.click();
            await this.page!.locator('#email_message_list').waitFor({ timeout: 15000 });
        }
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            try {
                await this.page!.getByRole('link', { name: /Refresh List|Refresh/i }).click();
                await this.page!.locator('#email_message_list').getByRole('link')
                    .filter({ hasText: subjectMatch || query }).first().waitFor({ timeout: 5000 });
                return;
            } catch {
                await this.page!.waitForTimeout(5000);
            }
        }
        throw new Error(`Email "${query}" not found`);
    }

    async openMail(subject: string | RegExp): Promise<void> {
        const locator = this.page!.locator('#email_message_list').getByRole('link', { name: subject }).first();
        console.log('Opening email:', await locator.innerText());
        await locator.click();
    }

    async getOTP(): Promise<string> {
        const otp = this.page!.locator('.email-body').getByText(/\b\d\d\d\d\d\d\b/);
        const text = await otp.innerText({ timeout: 15000 });
        return text.replaceAll(/[^\d]/g, '').trim();
    }

    async downloadAttachment(filename: string | RegExp): Promise<string> {
        const downloadButton = this.attachments.filter({ hasText: filename }).first().locator('.attach_download');
        const downloadPromise = this.page!.waitForEvent('download');
        await downloadButton.click();
        const download = await downloadPromise;
        const downloadPath = test.info().outputPath(download.suggestedFilename());
        await download.saveAs(downloadPath);
        return downloadPath;
    }
}

/** Cycle 7 sites, per docs/README.md section 4 - the ones whose specs are written in this repo. */
const SEARCH_ALL_FIELDS_SITES = ['ID', 'PH', 'CA', 'SG', 'CN', 'LV', 'IN', 'SE'];

export class Webmail implements EmailService {
    protected page: Page | undefined;
    readonly email: string;
    readonly password: string;

    constructor(email: string, password: string) {
        this.email = email;
        this.password = password;
    }

    get emailBody(): Locator {
        return this.page!.frameLocator('.readFrame iframe').locator('body');
    }

    get attachments(): Locator {
        return this.page!.locator('.fileList li');
    }

    async open(page: Page): Promise<void> {
        this.page = page;
        await page.goto('https://webmail.wisewires.com');
        await page.getByRole('link', { name: 'ENGLISH' }).click();
        await page.getByPlaceholder('ID').fill(this.email);
        await page.getByPlaceholder('Password').fill(this.password);
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page.getByRole('heading', { name: 'Inbox', exact: true }), 'Unable to login webmail').toBeVisible({ timeout: 30000 });
    }

    async search(query: string, options?: SearchOptions): Promise<void> {
        const { skipBefore, timeout, subjectMatch } = Object.assign({ timeout: 30000 }, options);
        console.log(`Searching for email${skipBefore ? ' (skipping old emails)' : ''}:`, query);
        const after = (skipBefore ? skipBefore.getTime() : Date.now()) - 60000;
        const mailList = this.page!.locator('.mailCheck');
        if (!await mailList.isVisible()) {
            await this.page!.getByRole('link', { name: 'Mail', exact: true }).click();
            await mailList.waitFor({ state: 'visible', timeout: 15000 });
        }
        // Cycle 7 sites search every field: their specs look mail up by order number, which lives
        // in the body, not the subject. The other sites keep the subject-only scope they were
        // written against. Both are picked by value - the option labels are English-only.
        const searchAllFields = SEARCH_ALL_FIELDS_SITES.includes(this.page!.context().site);
        await this.page!.locator('select[name="keyField"]')
            .selectOption({ value: searchAllFields ? '' : 'subject' });
        await this.page!.getByPlaceholder('Search mail').fill(query);
        for (let tries = 1; tries < Math.round(timeout / 3); tries++) {
            try {
                const elm = await this.page!.locator('.mailCheck').elementHandle();
                await this.page!.getByRole('button', { name: 'Search' }).click();
                await elm!.waitForElementState('hidden').catch(() => { });
                const rows = this.page!.locator('.mailCheck > tr');
                const locator = rows.filter({ has: this.page!.locator('.goto-read').filter({ hasText: subjectMatch || query }) }).first();
                await locator.waitFor({ timeout: 3000 });
                if (!skipBefore) return;
                const time = await locator.locator('td:nth-child(5)').evaluate((e: any) => new Date(e.innerText).getTime());
                if (time > after) return;
            } catch {
                await new Promise(r => setTimeout(r, 3000));
            }
            await this.page!.waitForTimeout(3000);
        }
        throw new Error(`Email "${query}" not found`);
    }

    async openMail(subject: string | RegExp): Promise<void> {
        const locator = this.page!.locator('.mailCheck .goto-read').filter({ hasText: subject }).first();
        console.log('Opening email:', await locator.innerText());
        await locator.click();
        await this.emailBody.waitFor({ timeout: 15000 });
    }

    async getOTP(): Promise<string> {
        const otp = this.page!.frameLocator('.readFrame iframe').getByText(/\b\d\d\d\d\d\d\b/);
        const text = await otp.innerText({ timeout: 15000 });
        return text.replaceAll(/[^\d]/g, '').trim();
    }

    async downloadAttachment(filename: string | RegExp): Promise<string> {
        const downloadButton = this.attachments.filter({ hasText: filename }).first().locator('.save-attach-file');
        const downloadPromise = this.page!.waitForEvent('download');
        await downloadButton.click();
        const download = await downloadPromise;
        const downloadPath = test.info().outputPath(download.suggestedFilename());
        await download.saveAs(downloadPath);
        return downloadPath;
    }
}
