import type { Locator, Page } from 'fixtures';

export default class MyReward {
    readonly convertPointSection: ConvertPointSection;
    readonly pointHistorySection: PointHistorySection;
    readonly rewardHistoryPopup: Locator;

    constructor(readonly page: Page) {
        this.convertPointSection = new ConvertPointSection(page.locator('.js-convert-point-cont:visible, .convert-points:visible, app-rewards-conversion'));
        this.pointHistorySection = new PointHistorySection(page.locator('.js-history-cont'));
        this.rewardHistoryPopup = page.locator('#reward-points-history-popup');
    }

    get url() {
        return this.page.context().myRewardURL;
    }
}

class ConvertPointSection {
    readonly convertTitle: Locator;
    readonly backToPaymentBtn: Locator;
    readonly viewMoreBtn: Locator;
    readonly convertItem: Locator;
    readonly convertNowBtn: Locator;
    readonly pointsInput: Locator;
    readonly exchangeRateInfo: Locator;
    readonly errorMessage: Locator;
    readonly getEstimateBtn: Locator;
    readonly estimatedPoints: Locator;
    readonly completedBtn: Locator;
    readonly doneBtn: Locator;
    readonly goBackBtn: Locator;
    readonly resultIcon: Locator;
    readonly pointText: Locator;
    readonly pointDescription: Locator;
    readonly disclaimer: Locator;
    readonly toolTip: Locator;
    readonly toolTipText: Locator;
    readonly fromText: Locator;
    readonly fromCountryIcon: Locator;
    readonly fromCountryName: Locator;
    readonly fromCountryPoint: Locator;
    readonly exchangeRate: Locator;
    readonly toText: Locator;
    readonly toCountryIcon: Locator;
    readonly toCountryName: Locator;
    readonly toCountryPoint: Locator;
    readonly convertedAmountLocal: Locator;

    constructor(readonly section: Locator) {
        this.convertTitle = section.getByRole('heading');
        this.backToPaymentBtn = section.locator('[an-la*=":go back"]:visible, [data-an-la="available points to convert:go back"]:visible');
        this.viewMoreBtn = section.locator('button.js-view-more-cta, button.view-more-cta');
        this.convertItem = section.getByRole('listitem').or(section.locator('mat-radio-button'));
        this.convertNowBtn = section.locator('button.js-convert-now, button[data-an-la$="convert now"]');
        this.pointsInput = section.locator('#point-text-field, .mdc-text-field__input:visible');
        this.exchangeRateInfo = section.locator('.assistive-message, .input-form .conversion-value');
        this.errorMessage = section.locator('.error-message, .points-error-message');
        this.getEstimateBtn = section.locator('button[an-la*="get an estimate"], button[data-an-la*="get an estimate"]');
        this.estimatedPoints = section.locator('.convert-points-to-area .global-point__point:visible, .rewards-pc-content.blue .value-container:visible').or(section.locator('.points-row .value-container').last()).first();
        this.completedBtn = section.locator('[an-la="convert points:complete"], [data-an-la="convert points:complete"]');
        this.doneBtn = section.locator('[an-la="convert points:done"], [data-an-la="convert points:done"]');
        this.goBackBtn = section.locator('[an-la="convert points:go back"]:visible, [an-la="go to my rewards"]:visible, [an-la="available points to convert:go back"]:visible, [data-an-la="go to my rewards"]:visible').first();
        this.resultIcon = section.locator('.conversion-completion__point-card-icon:visible, .circle-check-icon:visible');
        this.pointText = section.locator('.conversion-completion__point-card-point:visible, .pc-heading:visible');
        this.pointDescription = section.locator('.conversion-completion__point-card-total-point:visible, .bordered strong:visible');
        this.disclaimer = section.locator('.convert-content__disclaimer:visible, .cta-warning:visible');
        this.toolTip = section.locator('.convert-content__tooltip-cta:visible, .cta-tooltip:visible');
        this.toolTipText = section.locator('.convert-content__tooltip-text:visible, .tool-tip-content:visible');
        this.fromText = section.locator('.convert-points-from-area .conversion-completion__confirmed-box-title:visible');
        this.fromCountryIcon = section.locator('.convert-points-from-area .global-point__country-image:visible');
        this.fromCountryName = section.locator('.convert-points-from-area .global-point__country:visible');
        this.fromCountryPoint = section.locator('.convert-points-from-area .global-point__point:visible');
        this.exchangeRate = section.locator('.convert-points-from-area .global-point__point-exchange-rate:visible');
        this.toText = section.locator('.convert-points-to-area .conversion-completion__confirmed-box-title:visible');
        this.toCountryIcon = section.locator('.convert-points-to-area .global-point__country-image:visible');
        this.toCountryName = section.locator('.convert-points-to-area .global-point__country:visible');
        this.toCountryPoint = section.locator('.convert-points-to-area .global-point__point:visible');
        this.convertedAmountLocal = section.locator('.convert-points-to-area .global-point__point-exchange-rate:visible');
    }

    convertOption(country?: string): Locator {
        const page = this.section.page();
        if (!country) return this.convertItem.first();
        return this.convertItem.filter({
            has: page.locator(`[data-countryname*='${country}'i], [data-sitecode='${country}'i], [alt='${country}'i]`)
        });
    }

    async getOriginRate(country?: string) {
        const radio = this.convertOption(country).getByRole('radio');
        const amount = await radio.getAttribute('data-amount');
        const exchanged = await radio.getAttribute('data-exchanged');
        return parseFloat(exchanged!) / parseFloat(amount!);
    }

    async getMoneyExchangeRate(): Promise<number> {
        const text = await this.exchangeRateInfo.textContent();
        let [origin, local] = text!.split('=');
        local = local.replaceAll(/[^\d\.,]/g, '').replace(/,(\d\d?)$/, '.$1').replaceAll(',', '');
        origin = origin.replaceAll(/[^\d\.,]/g, '').replace(/,(\d\d?)$/, '.$1').replaceAll(',', '');
        return parseFloat(local) / parseFloat(origin);
    }

    async getEstimatedPoints(): Promise<number> {
        await this.estimatedPoints.waitFor();
        const text = await this.estimatedPoints.textContent();
        return parseInt(text!.replaceAll(/[^\d]/g, ''));
    }

    async getDataAmount(country?: string) {
        const radio = this.convertOption(country).getByRole('radio');
        const amount = await radio.getAttribute('data-amount');
        return amount;
    }
}

class PointHistorySection {
    readonly headline: Locator;
    readonly viewAllBtn: Locator;
    readonly historyTabList: Locator;
    readonly historyTabs: Locator;

    constructor(readonly section: Locator) {
        this.headline = section.getByRole('heading');
        this.viewAllBtn = section.locator('[an-la="point history:view all"]');
        this.historyTabList = section.getByRole('list');
        this.historyTabs = this.historyTabList.getByRole('listitem');
    }
}