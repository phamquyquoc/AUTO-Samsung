import { test } from 'fixtures';
import HAC from './hac';
import API from '../web/API';
import type { Page } from 'fixtures';

/** Order statuses that mean the consignment already left a given step behind. */
const PAST_SPLIT = ['ORDER_SPLIT', 'SHIPPING_REQUESTED', 'SHIPPED', 'WAITING_FOR_FINANCIAL', 'COMPLETED'];
const PAST_TRANSFER = ['SHIPPING_REQUESTED', 'SHIPPED', 'WAITING_FOR_FINANCIAL', 'COMPLETED'];
const PAST_BRITY = ['SHIPPED', 'WAITING_FOR_FINANCIAL', 'COMPLETED'];

/** Cronjob codes are the site code plus the shared toko job name - `ca-tokoFinancialCompletionJob`,
 *  `ph-tokoFinancialCompletionJob`. Read off HAC on both clusters on 2026-08-20. */
const tokoJob = (hac: HAC, name: string) => `${hac.context.site.toLowerCase()}-toko${name}`;

export async function getOrderStatus(hac: HAC, orderNumber: string) {
    const [status] = await hac.searchColumn(
        `SELECT {s.code} FROM {Order AS o JOIN OrderStatus AS s ON {o.status} = {s.pk}}
         WHERE {o.code} = '${orderNumber}' AND {o.versionID} IS NULL`,
        1,
    );
    return status ?? undefined;
}

export async function waitForStatusIn(hac: HAC, page: Page, orderNumber: string, statuses: string[], timeout = 1800) {
    for (let waited = 0; ; waited += 10) {
        const status = await getOrderStatus(hac, orderNumber);
        if (status && statuses.includes(status)) {
            console.log(`[HAC] ${orderNumber}: ${status} -> matched`);
            return status;
        }
        console.log(`[HAC] ${orderNumber}: ${status} -> waiting for ${statuses.join('|')}`);
        if (waited >= timeout) {
            throw new Error(`Order ${orderNumber} not moved to ${statuses.join('/')} after ${timeout}s, current status: ${status}`);
        }
        await page.waitForTimeout(10000);
    }
}

/**
 * Run a cronjob and wait for the order to leave its current step.
 *
 * Re-running only helps where the job can still pick the order up - measured on 2026-08-19, the
 * transfer job needed a second run (the first left the order on ORDER_SPLIT past 60s), while the
 * completion job did not: five runs all returned FINISHED/SUCCESS with startTime == endTime, i.e.
 * they selected nothing, and the order sat on WAITING_FOR_FINANCIAL for another six hours. That
 * step waits on the ERP financial update coming in, which no cronjob here can pull, so callers give
 * it one run and a long window instead of hammering it.
 *
 * On SG (2026-08-25) the transfer job took three runs before the consignment left
 * WAITING_FOR_TRANSFER and the SO was posted, so the retry budget is wider than CA needed.
 *
 * The whole run is slow by nature: a Brity job takes 15-20 minutes when the queue is healthy, and
 * an order needs upwards of half an hour end to end. The waits below are sized for that, not for
 * how long a cronjob itself runs.
 */
async function runCronjobUntilStatus(
    hac: HAC, page: Page, orderNumber: string, cronjob: string, targets: string[],
    { maxTries = 4, timeout = 240 } = {},
) {
    for (let tries = 1; tries <= maxTries; tries++) {
        const info = await hac.runCronjob(cronjob);
        console.log(`[HAC] ${cronjob}: ${info.status}/${info.result} | ${info.lastStartTime} -> ${info.lastEndTime}`);
        const status = await waitForStatusIn(hac, page, orderNumber, targets, timeout).catch(() => undefined);
        if (status) return status;
        if (tries < maxTries) console.log(`[HAC] ${orderNumber}: retry ${tries}/${maxTries - 1} ${cronjob}`);
    }
    return getOrderStatus(hac, orderNumber);
}

export async function getSONumbers(hac: HAC, page: Page, orderNumber: string, timeout = 900) {
    const query = `SELECT {c.gerpSalesOrderNr} FROM {Consignment AS c JOIN Order AS o ON {c.order} = {o.pk}}
                   WHERE {o.code} = '${orderNumber}'`;
    for (let waited = 0; ; waited += 10) {
        const values = await hac.searchColumn(query);
        console.log(`[HAC] ${orderNumber} SO: ${values.filter(Boolean).join(', ') || '(empty)'}`);
        if (values.length && values.every(v => v && v.trim() != '')) return values as string[];
        if (waited >= timeout) throw new Error(`Unable to get SO numbers for ${orderNumber} after ${timeout}s`);
        await page.waitForTimeout(10000);
    }
}

export async function runBrityJobs(api: API, soNumbers: string[]) {
    for (const soNumber of soNumbers) {
        const proc = await api.getBrityProcess('D2C_eStore_NERP_Normal_Process');
        const createJobRes = await api.createBrityJob(proc.id, { inNormalSaleOrder: soNumber });
        console.log(`Job ID for ${soNumber}: ${createJobRes.jobId}`, new Date().toLocaleString());
        // Brity is queue-bound: 15-20 minutes is a healthy run, so the default 1800s window is
        // too tight when the queue is backed up.
        await api.waitForBrityJobDone(createJobRes.jobId, 3600);
        console.log(`Brity job done for ${soNumber}:`, new Date().toLocaleString());
    }
}

/**
 * Drive an order to Completed over HAC - no Backoffice UI at all. Automation_Reg reaches HAC with
 * the same credentials the Backoffice sign-in uses (AUTOMATION_REG_{cluster}_PASSWORD: SMC for CA,
 * SMS for PH). Everything site-specific comes off the context, so this file is the same on both.
 */
export async function completeOrder(hac: HAC, page: Page, orderNumber: string) {
    const initialJob = tokoJob(hac, 'FinancialInitialUpdateJob');
    const transferJob = tokoJob(hac, 'TransferConsignmentToWarehouseJob');
    const completionJob = tokoJob(hac, 'FinancialCompletionJob');

    const status = await getOrderStatus(hac, orderNumber);
    console.log(`[HAC] ${orderNumber}: ${status}`);
    if (status == 'COMPLETED') return;

    await test.step(`Run ${initialJob} cronjob`, async (step) => {
        const status = await waitForStatusIn(hac, page, orderNumber, ['WAITING_FOR_SEND_FINANCIAL', ...PAST_SPLIT]);
        if (status != 'WAITING_FOR_SEND_FINANCIAL') return step.skip();
        await runCronjobUntilStatus(hac, page, orderNumber, initialJob, PAST_SPLIT);
    });
    await test.step(`Run ${transferJob} cronjob`, async (step) => {
        const status = await waitForStatusIn(hac, page, orderNumber, ['ORDER_SPLIT', ...PAST_TRANSFER]);
        if (status != 'ORDER_SPLIT') return step.skip();
        await runCronjobUntilStatus(hac, page, orderNumber, transferJob, PAST_TRANSFER);
    });

    await waitForStatusIn(hac, page, orderNumber, PAST_TRANSFER);
    const soNumbers = await getSONumbers(hac, page, orderNumber);
    console.log(`Sales Order Numbers: ${soNumbers}`);
    const beforeBrity = await getOrderStatus(hac, orderNumber);
    if (!beforeBrity || !PAST_BRITY.includes(beforeBrity)) {
        await runBrityJobs(new API(page), soNumbers);
    }
    console.log(`[HAC] ${orderNumber}: ${await getOrderStatus(hac, orderNumber)} after Brity run`);

    // No cronjob moves the order here: Brity takes it to SHIPPED on its own, and the ERP financial
    // update then brings it to WAITING_FOR_FINANCIAL. Only from there can the completion job select
    // it, so running the job any earlier finishes without picking the order up.
    await waitForStatusIn(hac, page, orderNumber, ['WAITING_FOR_FINANCIAL', 'COMPLETED'], 1200);
    const finalStatus = await test.step(`Run ${completionJob} cronjob`, async () => {
        return runCronjobUntilStatus(hac, page, orderNumber, completionJob, ['COMPLETED'], {
            maxTries: 4, timeout: 300,
        });
    });
    if (finalStatus != 'COMPLETED') {
        throw new Error(
            `Order not moved to Completed: ${orderNumber} / ${finalStatus}` +
            (finalStatus == 'WAITING_FOR_FINANCIAL' ? ' - the ERP financial update never arrived' : ''),
        );
    }
}
