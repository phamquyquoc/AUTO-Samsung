import type { Locator } from 'playwright';
import Backoffice from './Backoffice';
import EditorArea from './EditorArea';
import ListingArea from './ListingArea';
import Attribute from './Attribute';

class WizardProperty extends Attribute {
    constructor(readonly area: Locator, label: string) {
        super(area, label);
        this.cell = area.locator(`[class*="yw-wizard-property"]:has([class*="wizard-property-label"]:text-is("${label}")):visible`);
    }
}

export default class Modal {
    private modal: Locator;

    readonly listing: ListingArea;
    readonly editor: EditorArea;

    readonly notificationMessage: Locator;
    readonly failureMessage: Locator;

    readonly acceptBtn: Locator;
    readonly cancelBtn: Locator;
    readonly closeBtn: Locator;
    readonly continueBtn: Locator;
    readonly finishBtn: Locator;
    readonly okBtn: Locator;
    readonly refreshBtn: Locator;
    readonly submitBtn: Locator;
    readonly yesBtn: Locator;
    readonly saveBtn: Locator;

    constructor(readonly app: Backoffice) {
        this.modal = app.page.locator('type=modal');
        this.listing = new ListingArea(app, this.modal);
        this.editor = new EditorArea(app, this.modal.locator('.yw-editorarea-body:visible'));

        this.notificationMessage = this.modal.locator('.yw-notification-message');
        this.failureMessage = this.modal.locator('.yw-notification-message.failure');

        this.acceptBtn = this.modal.getByRole('button', { name: 'Accept' });
        this.cancelBtn = this.modal.getByRole('button', { name: 'Cancel' });
        this.closeBtn = this.modal.getByRole('button', { name: 'Close' });
        this.continueBtn = this.modal.getByRole('button', { name: 'Continue' });
        this.finishBtn = this.modal.getByRole('button', { name: 'Finish', exact: true });
        this.okBtn = this.modal.getByRole('button', { name: 'OK' });
        this.refreshBtn = this.modal.getByRole('button', { name: 'Refresh' });
        this.submitBtn = this.modal.getByRole('button', { name: 'Submit' });
        this.yesBtn = this.modal.getByRole('button', { name: 'Yes' });
        this.saveBtn = this.modal.getByRole('button', { name: 'Save' });
    }

    attribute(label: string): Attribute {
        return this.editor.attribute(label);
    }

    wizardProperty(label: string): Attribute {
        return new WizardProperty(this.modal, label);
    }

    button(name: string): Locator {
        return this.modal.getByRole('button', { name, exact: true });
    }

    locator(selector: string, options?: LocatorOptions): Locator {
        return this.modal.locator(selector, options);
    }

    placeholder(text: string): Locator {
        return this.modal.getByPlaceholder(text);
    }

    text(text: string): Locator {
        return this.modal.getByText(text);
    }
}
