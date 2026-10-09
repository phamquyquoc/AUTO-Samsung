import type { Locator, Page } from 'fixtures';
import Address from './Address';
import Form, { Checkbox } from './Form';

export default class ProfileSettings {
  readonly addresses: Addresses;
  readonly preferences: Locator;
  readonly savedCards: SavedCards;
  readonly addressDialog: AddressDialog;
  readonly savedCardDialog: SavedCardDialog;
  readonly removeAddressModal: RemoveAddressModal;

  constructor(readonly page: Page) {
    this.addresses = new Addresses(page.locator('app-address-profile, app-address-profile-tr'));
    this.preferences = page.locator('app-preferences-profile');
    this.savedCards = new SavedCards(page.locator('app-payment-profile'));
    this.addressDialog = new AddressDialog(page.locator('app-address-form-dialog'));
    this.savedCardDialog = new SavedCardDialog(page.locator('app-payment-form-dialog'));
    const removeAddressModal = page.locator('app-confirmation-modal');
    this.removeAddressModal = Object.assign(removeAddressModal, {
      closeBtn: removeAddressModal.locator('.modal__close'),
      cancelBtn: removeAddressModal.locator('[data-an-la*=":cancel"]'),
      confirmBtn: removeAddressModal.locator('[data-an-la*=":delete"]')
    });
  }

  get url() {
    return this.page.context().myProfileURL;
  }
}

interface AddressCard extends Locator {
  readonly editBtn: Locator;
  readonly deleteBtn: Locator;
  readonly info: Locator;
}

class Addresses {
  readonly addBtn: Locator;
  readonly tabList: Locator;
  readonly deliveryTab: Locator;
  readonly billingTab: Locator;
  readonly tabPanel: Locator;
  readonly cards: AddressCard;
  readonly primaryCard: AddressCard;
  readonly firstCard: AddressCard;
  readonly viewMoreBtn: Locator;

  static card(card: Locator): AddressCard {
    return Object.assign(card, {
      editBtn: card.locator('[data-an-la="address:edit"]'),
      deleteBtn: card.locator('[data-an-la="address:delete"]'),
      info: card.locator('.card__info')
    });
  }

  constructor(readonly section: Locator) {
    this.addBtn = section.locator('[data-an-la="address:add"]');
    this.tabList = section.getByRole('tablist');
    this.deliveryTab = this.tabList.getByRole('tab').first();
    this.billingTab = this.tabList.getByRole('tab').last();
    this.tabPanel = section.getByRole('tabpanel');
    this.cards = Addresses.card(this.tabPanel.getByRole('listitem'));
    const primary = this.section.page().locator('.card__primary');
    this.primaryCard = Addresses.card(this.cards.filter({ has: primary }));
    this.firstCard = Addresses.card(this.cards.first());
    this.viewMoreBtn = section.locator('[data-an-la="address:view more"]');
  }
}

class AddressDialog extends Address {
  readonly header: Locator;
  readonly closeBtn: Locator;
  readonly cancelBtn: Locator;
  readonly saveBtn: Locator;
  readonly setPrimaryCbx: Checkbox;
  readonly sameForBillingCbx: Checkbox;

  constructor(dialog: Locator) {
    super(dialog.locator('form'));
    this.header = dialog.locator('.modal__header');
    this.closeBtn = dialog.locator('.modal__close');
    this.cancelBtn = dialog.locator('[data-an-la$=":cancel"], .cancel-button, .cancel-btn');
    this.saveBtn = dialog.locator('[data-an-la$=":save"], .save-button, .save-btn, .address-form [type="submit"]');
    this.setPrimaryCbx = this.checkbox('defaultAddress');
    this.sameForBillingCbx = this.checkbox('billingAddress');
  }

  override async autoFill(data: Record<string, any>) {
    await super.autoFill(new Proxy(data, {
      get(target, prop) {
        switch (prop) {
          case 'titleCode':
            return target.title;
          case 'recipientName':
            return data.firstName + ' ' + data.lastName;
          case 'recipientNumber':
            return data.phoneNumber;
          case 'prefix':
          case 'telephonePrefix':
            return target.phoneCode;
          case 'phone':
          case 'telephoneInput':
            return target.phoneNumber || target.phone;
          case 'postcode':
            return target.postalCode;
          case 'region':
          case 'regionIso':
          case 'state':
            return target.region || target.regionIso;
          case 'townCity':
          case 'townCode':
          case 'city':
            return target.town;

        }
        return Reflect.get(target, prop);
      }
    }));
  }
}

export interface RemoveAddressModal extends Locator {
  readonly closeBtn: Locator;
  readonly cancelBtn: Locator;
  readonly confirmBtn: Locator;
}

interface SavedCard extends Locator {
  readonly editBtn: Locator;
  readonly deleteBtn: Locator;
  readonly cardName: Locator;
}

class SavedCards {
  readonly addBtn: Locator;
  readonly cards: SavedCard;
  readonly primaryCard: SavedCard;
  readonly firstCard: SavedCard;
  readonly emptySection: Locator;

  static card(card: Locator): SavedCard {
    return Object.assign(card, {
      primaryCbx: card.getByRole('checkbox'),
      deleteBtn: card.locator('[data-an-la*="delete"]'),
      editBtn: card.locator('.edit-payment-btn'),
      cardName: card.locator('.card__name')
    });
  }

  constructor(readonly section: Locator) {
    this.addBtn = section.locator('.add-payment-btn');
    this.cards = SavedCards.card(section.locator('.payment__cards ul li'));
    const primary = section.page().locator('.card__primary');
    this.primaryCard = SavedCards.card(this.cards.filter({ has: primary }));
    this.firstCard = SavedCards.card(this.cards.first());
    this.emptySection = section.locator('.payment-empty');
  }
}

class SavedCardDialog {
  readonly header: Locator;
  readonly closeBtn: Locator;
  readonly cardNumber: Locator;
  readonly holderName: Locator;
  readonly expiryDate: Locator;
  readonly cvv: Locator;
  readonly termsAndConditions: Checkbox;
  readonly setPrimaryCbx: Checkbox;
  readonly cancelBtn: Locator;
  readonly saveBtn: Locator;

  constructor(dialog: Locator) {
    this.header = dialog.locator('.modal__header');
    this.closeBtn = dialog.locator('.modal__close');
    this.cardNumber = dialog.frameLocator('.input-card-number iframe').getByRole('textbox');
    this.holderName = dialog.frameLocator('.input-holder-name').getByRole('textbox');
    this.expiryDate = dialog.frameLocator('.input-expiry-date iframe').getByRole('textbox');
    this.cvv = dialog.frameLocator('.input-cvv iframe').getByRole('textbox');
    this.termsAndConditions = Form.checkbox(dialog.locator('app-payment-modes-terms-and-conditions mat-checkbox'));
    this.setPrimaryCbx = Form.checkbox(dialog.locator('.payment-form__checkbox'));
    this.cancelBtn = dialog.locator('.pill-btn--white');
    this.saveBtn = dialog.locator('.pill-btn--black');
  }
}
