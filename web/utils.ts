export function formatPrice(amount: number, locale: string, decimalDigits = 2) {
    return (Math.round(amount * 100) / 100).toLocaleString(locale, { minimumFractionDigits: decimalDigits, maximumFractionDigits: decimalDigits, useGrouping: true });
}

export function parsePrice(text: string, locale: string) {
    let priceText = text.replaceAll(/[^\d,\.']/g, '').replace(/\.$/, '');
    const match = Intl.NumberFormat(locale).format(1234567.89).match(/\D/g)!;

    const group = match.length >= 2 ? match[0] : ' ';  // thousands separator
    const decimal = ['de-CH'].includes(locale) ? ',' : match.length >= 2 ? match[match.length - 1] : match[0]; // decimal separator

    if (!priceText.includes(decimal) && /\.\d{2}$/.test(priceText)) {
        priceText = priceText.replace(/\.(\d{2})$/, `${decimal}$1`);
    }

    return Number(priceText.replace(new RegExp(`\\${group}`, 'g'), '').replace(new RegExp(`\\${decimal}`), '.'));
}
