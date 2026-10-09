import { Locator } from 'playwright';
import Form, { Checkbox, FormField } from './Form';

export type CustomerType = 'personal' | 'company' | 'personal-company';

export default class CustomerInfo extends Form {
    readonly email: FormField;
    readonly title: FormField;
    readonly fullName: FormField;
    readonly firstName: FormField;
    readonly lastName: FormField;
    readonly phoneCode: FormField;
    readonly phoneNumber: FormField;
    readonly personalCbx: Checkbox;
    readonly companyCbx: Checkbox;
    readonly companyEmail: FormField;
    readonly companyName: FormField;
    readonly companyId: FormField;
    readonly companyPhone: FormField;

    constructor(form: Locator) {
        super(form);
        this.email = this.field('email');
        this.title = this.field('titleCode');
        this.fullName = this.field('fullName');
        this.firstName = this.field('firstName', 'purchaserFirstName');
        this.lastName = this.field('lastName', 'purchaserLastName');
        this.phoneCode = this.field('phonePrefix', 'prefix', 'telephoneCode');
        this.phoneNumber = this.field('phone', 'telephone', 'purchaserNumber');
        this.personalCbx = this.checkbox('identificationTypeOptionOne');
        this.companyCbx = this.checkbox('identificationTypeOptionTwo');
        this.companyEmail = this.field('companyEmail');
        this.companyName = this.field('companyName');
        this.companyId = this.field('companyId');
        this.companyPhone = this.field('companyPhone');
    }

    async autoFill(data: { customerType?: CustomerType } & Record<string, any>) {
        const site = (this.page.context() as any).site;
        if (await this.personalCbx.isVisible()) {
            await this.personalCbx.check();
        }
        if (data.customerType) {
            await (data.customerType == 'personal' ? this.personalCbx : this.companyCbx).check();
        }
        const fields = this.form.getByRole('textbox').or(this.form.getByRole('combobox'));
        await fields.first().waitFor({ timeout: 15000 });
        let validationPromise: Promise<any> = Promise.resolve();
        for (let tries = 1; tries <= 3; tries++) {
            try {
                for (const field of await fields.all()) {
                    if (await Form.isReadOnly(field)) continue;
                    if (!await Form.isRequired(field)) continue;
                    const name = await field.getAttribute('name') as string;
                    switch (name) {
                        case 'titleCode':
                            if (!data.title) continue;
                            await Form.selectCombobox(field, data.title);
                            console.log(`Field title selected: ${data.title}`);
                            break;
                        case 'firstName':
                        case 'purchaserFirstName':
                            await field.fill(data.firstName);
                            console.log(`Field firstName filled: ${data.firstName}`);
                            break;
                        case 'lastName':
                        case 'purchaserLastName':
                            await field.fill(data.lastName);
                            console.log(`Field lastName filled: ${data.lastName}`);
                            break;
                        case 'phonePrefix':
                        case 'prefix':
                        case 'telephoneCode':
                            if (!data.phoneCode) continue;
                            await Form.selectCombobox(field, data.phoneCode);
                            console.log(`Field phoneCode selected: ${data.phoneCode}`);
                            break;
                        case 'phone':
                        case 'telephone':
                        case 'purchaserNumber':
                            if (site.startsWith('KZ')) {
                                await field.click();
                                await this.page.waitForTimeout(200);
                                await field.press('ControlOrMeta+A');
                                await this.page.waitForTimeout(200);
                                await field.press('Delete');
                                await this.page.waitForTimeout(200);
                            }
                            await field.fill(data.phoneNumber);
                            await field.click({ force: true, position: { x: 4, y: -8 } });
                            console.log(`Field phoneNumber filled: ${data.phoneNumber}`);
                            break;
                        case 'identificationType':
                        case 'tvLicenseType':
                            if (!data[name]) continue;
                            await Form.selectCombobox(field, data[name]);
                            console.log(`Field ${name} selected: ${data[name]}`);
                            break;
                        case 'personalTaxNumber':
                            if ((this.form.page().context() as any).site == 'TR') {
                                validationPromise = validationPromise.then(() => this.form.page().waitForResponse(/validateTcknNumber/, { timeout: 15000 }).catch(() => { }));
                            }
                            await field.fill(data[name]);
                            break;
                        case 'dayOfBirth':
                        case 'monthOfBirth':
                        case 'yearOfBirth':
                            await Form.selectCombobox(field, data[name]);
                            console.log(`Field ${name} selected: ${data[name]}`);
                            break;
                        case 'customerDOB':
                            await field.fill(data[name]);
                            validationPromise = validationPromise.then(() =>
                                this.form.page().waitForResponse(/validateTcknNumber/, { timeout: 15000 }).catch(() => { })
                            );
                            break;
                        default:
                            if (!data[name]) continue;
                            await field.fill(data[name]);
                            console.log(`Field ${name} filled: ${data[name]}`);
                            break;
                    }
                }
                break;
            } catch (error) {
                if (tries == 3) throw error;
            }
        }
        await this.form.click({ force: true, position: { x: 0, y: 0 } });
        await validationPromise;
    }

    async fillDateOfBirth(date: Date | number = 30) {
        const dayField = this.field('dayOfBirth', 'birthDay', 'day');
        if (!await dayField.count()) return false;
        const dob = typeof date == 'number' ? new Date(new Date().getFullYear() - date, 5, 15) : date;

        const select = async (field: FormField, value: number) => {
            for (const option of [String(value).padStart(2, '0'), String(value), value]) {
                try {
                    return await field.select(option);
                } catch { /* try the next spelling of the same value */ }
            }
            throw new Error(`unable to select ${value} in the date of birth`);
        };
        await select(dayField, dob.getDate());
        await select(this.field('monthOfBirth', 'birthMonth', 'month'), dob.getMonth() + 1);
        await this.field('yearOfBirth', 'birthYear', 'year').select(String(dob.getFullYear()));
        console.log(`Field dateOfBirth selected: ${dob.toDateString()}`);
        return true;
    }

    async fill(data: Record<string, string | number>) {
        const site = (this.page.context() as any).site;
        for (const [name, value] of Object.entries(data) as any) {
            switch (name) {
                case 'title':
                    await this.title.select(value);
                    break;
                case 'firstName':
                    await this.firstName.fill(value);
                    break;
                case 'lastName':
                    await this.lastName.fill(value);
                    break;
                case 'phoneCode':
                    await this.phoneCode.select(value);
                    break;
                case 'phoneNumber':
                    if (site.startsWith('KZ')) {
                        await this.phoneNumber.click();
                        await this.page.waitForTimeout(200);
                        await this.phoneNumber.press('ControlOrMeta+A');
                        await this.page.waitForTimeout(200);
                        await this.phoneNumber.press('Delete');
                        await this.page.waitForTimeout(200);
                    }
                    await this.phoneNumber.fill(value);
                    await this.phoneNumber.click({ force: true, position: { x: 4, y: -8 } });
                    break;
                case 'identificationType':
                    await this.field(name).select(value);
                    break;
                default:
                    await this.field(name).fill(value);
                    break;
            }
            console.log(`Field ${name} filled: ${value}`);
        }
    }
}
