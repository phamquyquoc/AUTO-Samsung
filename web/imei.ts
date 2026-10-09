import { BrowserContext } from 'playwright';

export async function randomIMEI(context: BrowserContext, brand: string, model?: string) {
    const page = await context.newPage();
    try {
        await page.goto('https://www.coolgenerator.com/imei-generator', { waitUntil: 'domcontentloaded' });
        await page.selectOption('[name="brand"]', brand);
        if (model) {
            await page.selectOption('[name="model"]', model);
        }
        await page.getByRole('button', { name: 'Generate' }).click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        const count = await page.locator('b.font-18').count();
        return await page.locator('b.font-18').nth(Math.floor(Math.random() * count)).textContent() as string;
    } finally {
        await page.close();
    }
}

export function generateIMEI(): string {
    const length = 15;
    const imei: number[] = new Array(length).fill(0);
    const rbiList = [
        "35", "44", "45", "49", "50", "51", "52",
        "53", "54", "86", "91", "98", "99"
    ];
    const rbi = rbiList[Math.floor(Math.random() * rbiList.length)];
    imei[0] = Number(rbi.charAt(0));
    imei[1] = Number(rbi.charAt(1));
    for (let i = 2; i < length - 1; i++) {
        imei[i] = Math.floor(Math.random() * 10);
    }
    let sum = 0;
    const lenOffset = (length + 1) % 2;
    for (let i = 0; i < length - 1; i++) {
        let val = imei[i];
        if ((i + lenOffset) % 2 !== 0) {
            val *= 2;
            if (val > 9) val -= 9;
        }
        sum += val;
    }
    imei[length - 1] = (10 - (sum % 10)) % 10;
    return imei.join('');
}
