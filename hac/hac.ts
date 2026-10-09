import { Context } from '../web/context';
import { AddressCollection } from './address';
import { DeliveryModeCollection } from './deliveryMode';
import { OrderCollection } from './order';
import { PointOfServiceCollection } from './pointOfService';
import { ProductCollection } from './product';
import { PromotionCollection } from './promotion';
import { StockCollection } from './stock';

const HAC_URL_MAP: Record<string, string> = {
    'SMA': 'el5-s2',
    'SMB': 'e12-s2',
    'SMC': 'el4-s2',
    'SMI': 'el2-s2',
    'SMN': 'el1-s2',
    'SMN2': 'el6-s2',
    'SMN3': 'el7-s2',
    'SMN4': 'e10-s2',
    'SMN5': 'e11-s2',
    'SMR': 'el9-s2',
    'SMS': 'el3-s2'
}

const LOCALE_MAP: Record<string, string> = {
    'AE_AR': 'ar_AE',
    'AE': 'en_AE',
    'AT': 'de_AT',
    'AU': 'en',
    'BE_FR': 'fr_BE',
    'BE': 'nl_BE',
    'BG': 'bg_BG',
    'BH_AR': 'ar_BH',
    'BH': 'en_BH',
    'CA_FR': 'fr_CA',
    'CN': 'zh_CN',
    'CA': 'en_CA',
    'CH_FR': 'fr_CH',
    'CH': 'de_CH',
    'CL': 'es_CL',
    'CO': 'es_CO',
    'CZ': 'cs_CZ',
    'DE': 'de',
    'DK': 'da',
    'EE': 'et_EE',
    'EG': 'ar_EG',
    'ES': 'es',
    'FI': 'fi',
    'FR': 'fr',
    'GR': 'el_GR',
    'HK_EN': 'en_HK',
    'HK': 'zh_HK',
    'HR': 'hr_HR',
    'HU': 'hu_HU',
    'ID': 'id',
    'IL': 'iw_IL',
    'IN': 'en_IN',
    'IQ_AR': 'ar_IQ',
    'IQ_KU': 'ku_IQ',
    'IT': 'it',
    'JO_AR': 'ar_JO',
    'JO': 'en_JO',
    'JP': 'ja',
    'KW_AR': 'ar_KW',
    'KW': 'en_KW',
    'KZ_KZ': 'kk_KZ',
    'KZ_RU': 'ru_KZ',
    'LT': 'lt_LT',
    'LV': 'lv_LV',
    'MA': 'fr_MA',
    'MX': 'es_MX',
    'MY': 'en_MY',
    'NL': 'nl',
    'NO': 'no',
    'NZ': 'en_NZ',
    'OM_AR': 'ar_OM',
    'OM': 'en_OM',
    'PE': 'es_PE',
    'PH': 'en_PH',
    'PK': 'en_PK',
    'PL': 'pl_PL',
    'PT': 'pt_PT',
    'QA_AR': 'ar_QA',
    'QA': 'ar_QA',
    'RO': 'ro_RO',
    'SA_EN': 'en_SA',
    'SA': 'ar_SA',
    'SE': 'sv',
    'SG': 'en_SG',
    'SI': 'sl_SI',
    'SK': 'sk_SK',
    'TH': 'th_TH',
    'TR': 'tr_TR',
    'TW': 'zh_TW',
    'UA': 'uk_UA',
    'UK': 'en_GB',
    'VN': 'vi',
    'ZA': 'en_ZA'
}

function getLocale(site: string) {
    const code = site.toUpperCase().split('_')[0];
    if (!Object.hasOwn(LOCALE_MAP, code)) throw new Error(`[HAC] Unknown site: ${site}`);
    return LOCALE_MAP[code as keyof typeof LOCALE_MAP];
}

export default class HAC {
    private url: string;
    private csrf?: string;

    orders: OrderCollection;
    addresses: AddressCollection;
    deliveryModes: DeliveryModeCollection;
    pointsOfService: PointOfServiceCollection;
    products: ProductCollection;
    promotions: PromotionCollection;
    stock: StockCollection;

    constructor(readonly context: Context) {
        const cluster = context.profile.cluster;
        this.url = context.profile.boDomain
            ? `${context.profile.boDomain}/hac`
            : `https://backoffice.cnmzsgcaar-samsung${HAC_URL_MAP[cluster]}-public.model-t.cc.commerce.ondemand.com/hac`;
        this.orders = new OrderCollection(this);
        this.addresses = new AddressCollection(this);
        this.deliveryModes = new DeliveryModeCollection(this);
        this.pointsOfService = new PointOfServiceCollection(this);
        this.products = new ProductCollection(this);
        this.promotions = new PromotionCollection(this);
        this.stock = new StockCollection(this);
    }

    /** HAC answers well past the project's 20s actionTimeout when the node is cold. */
    private static readonly LOGIN_TIMEOUT = 120000;

    private async fetchCSRF(path: string): Promise<string> {
        const url = this.url + path;
        const res = await this.context.request.get(url, { timeout: HAC.LOGIN_TIMEOUT });
        if (!res.ok()) throw new Error(`[HAC] Failed to fetch CSRF token at ${path} (status ${res.status()})`);
        const html = await res.text();
        const csrf = html.match(/name="_csrf"[^>]*content="([^"]+)"/);
        if (!csrf) throw new Error(`[HAC] CSRF token not found at ${path} (status ${res.status()})`);
        return csrf[1];
    }

    private async login() {
        const csrf = await this.fetchCSRF('/login');
        const res = await this.context.request.post(this.url + '/j_spring_security_check', {
            form: {
                j_username: this.context.boInfo.account,
                j_password: this.context.boPassword,
                _csrf: csrf,
            },
            maxRedirects: 0,
            timeout: HAC.LOGIN_TIMEOUT,
        });
        // maxRedirects is 0, so Spring Security's successful form login answers 302
        const location = res.headers()['location'] || '';
        if (res.status() != 302 || location.includes('login_error')) {
            throw new Error(
                `[HAC] Failed to login for ${this.context.boInfo.account}` +
                ` (status ${res.status()} location ${location || '(none)'})`,
            );
        }
        this.csrf = await this.fetchCSRF('/console/flexsearch');
    }

    /**
     * `timeout` overrides the project's 20s actionTimeout, which a plain query clears easily but a
     * script that publishes rules into the engine does not - that one runs for minutes.
     */
    async executeGroovy(script: string, commit = true, timeout = 300000): Promise<string> {
        if (!this.csrf) await this.login();
        const res = await this.context.request.post(this.url + '/console/scripting/execute', {
            headers: { 'X-CSRF-TOKEN': this.csrf! },
            form: {
                script,
                scriptType: 'groovy',
                commit: String(commit),
            },
            timeout,
        });
        if (!res.ok()) throw new Error(`[HAC] Failed to execute Groovy (status ${res.status()})`);
        if (!res.headers()['content-type']?.includes('json')) {
            this.csrf = undefined;
            return this.executeGroovy(script, commit, timeout);
        }
        const data = await res.json();
        if (data.stacktraceText) throw new Error(`[HAC] Groovy execution error: ${data.stacktraceText.split('\n', 2).join('\n')}`);
        return data.executionResult;
    }

    async flexibleSearch(query: string, options?: { maxCount?: number, commit?: boolean }): Promise<any[]> {
        if (!this.csrf) await this.login();
        const { maxCount, commit } = Object.assign({ maxCount: 1, commit: false }, options);
        const res = await this.context.request.post(this.url + '/console/flexsearch/execute', {
            headers: { 'X-CSRF-TOKEN': this.csrf! },
            form: {
                flexibleSearchQuery: query,
                sqlQuery: '',
                maxCount: String(maxCount),
                user: this.context.boInfo.account,
                locale: getLocale(this.context.site),
                commit: String(commit),
            },
        });
        if (!res.ok()) throw new Error(`[HAC] Failed to perform flexible search (status ${res.status()})`);
        if (!res.headers()['content-type']?.includes('json')) {
            this.csrf = undefined;
            return this.flexibleSearch(query, options);
        }
        const data = await res.json();
        if (data.exception) throw new Error(`[HAC] Flexible search error: ${data.exception.message}\nQuery: ${query}`);
        const result = [];
        for (const row of data.resultList) {
            const item: any = {};
            for (let i = 0; i < row.length; i++) {
                item[data.headers[i]] = row[i];
            }
            result.push(item);
        }
        return result;
    }

    /**
     * Single-column flexible search, run through the Groovy console.
     *
     * `flexibleSearch()` posts the HAC console form, which pins the DataLocale to `tr_TR` - a
     * locale only TR carries, so CA and PH answer `No matching DataLocale for tr_TR`. The Groovy
     * console takes no locale at all, so sites outside TR query through here.
     *
     * The query is embedded in a Groovy `'''...'''` literal: no `$` interpolation, and single
     * quotes around values are safe.
     */
    async searchColumn(query: string, maxCount = 20): Promise<(string | null)[]> {
        const result = await this.executeGroovy(`
                import groovy.json.JsonOutput
                import de.hybris.platform.servicelayer.search.FlexibleSearchQuery
                def query = new FlexibleSearchQuery('''${query}''')
                query.resultClassList = [String.class]
                query.count = ${maxCount}
                return JsonOutput.toJson(flexibleSearchService.search(query).result)
        `, false);
        return JSON.parse(result);
    }

    async runCronjob(code: string) {
        console.log(`[HAC] Running cronjob ${code}`);
        const result = await this.executeGroovy(`
                import groovy.json.JsonOutput
                def cronJob = cronJobService.getCronJob("${code}")
                cronJobService.performCronJob(cronJob, true)
                modelService.refresh(cronJob)
                def fmt = new java.text.SimpleDateFormat("MMM d, yyyy, h:mm:ss a", java.util.Locale.US)
                return JsonOutput.toJson([
                    status: cronJob.status.toString(),
                    result: cronJob.result.toString(),
                    lastStartTime: cronJob.startTime ? fmt.format(cronJob.startTime) : null,
                    lastEndTime: cronJob.endTime ? fmt.format(cronJob.endTime) : null
                ])
        `);
        return JSON.parse(result) as { status: string; result: string; lastStartTime?: string; lastEndTime?: string };
    }

    async setTokoConfig(key: string, value: string) {
        console.log(`[HAC] Setting TokoConfigProperty ${key} = ${value}`);
        const result = await this.executeGroovy(`
                import groovy.json.JsonOutput
                import de.hybris.platform.servicelayer.search.FlexibleSearchQuery
                import de.hybris.platform.core.Registry
                def q = new FlexibleSearchQuery("SELECT {pk} FROM {TokoConfigProperty} WHERE {key}=?k")
                q.addQueryParameter('k', "${key}")
                def items = flexibleSearchService.search(q).result
                if (!items) throw new IllegalStateException("${key} not found")
                def item = items[0]
                modelService.setAttributeValue(item, 'value', "${value}")
                modelService.save(item)
                modelService.refresh(item)
                try { Registry.getCurrentTenant().getCache().invalidate(item.pk) } catch (Throwable ignored) {}
                return JsonOutput.toJson([
                    key: "${key}",
                    value: item.value?.toString()
                ])
        `);
        return JSON.parse(result) as { key: string; value: string };
    }
}
