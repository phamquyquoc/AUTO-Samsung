import HAC from './hac';

export type RuleVersion = {
    code: string;
    version: number;
    status: string;
};

/**
 * A rule to deploy: the code alone takes its newest version, which is what a rule built by
 * `clone()` needs. Pin the version when an older one is the one that fires - editing a rule leaves
 * the newer version behind, so the newest is not always the working one.
 */
export type RuleRef = string | { code: string, version: number };

export type CloneOptions = {
    /** Code of the rule to clone. Only its newest version accepts edits, so that one is taken. */
    source: string;
    /** Pin the source version when several exist and the newest is not the working one. */
    sourceVersion?: number;
    /** Code of the new rule. Also written into `Info Message`, which is what the cart displays. */
    code: string;
    /** SKUs for the qualifying-products conditions, in the order the conditions appear. */
    products: string[];
    /** Product catalog the SKUs belong to, e.g. `sgEstoreProductCatalog`. */
    catalog: string;
    /** Locales of `Info Message`. The storefront reads the site locale, so pass both, e.g. `['en', 'en_SG']`. */
    locales: string[];
    /** Action parameters to overwrite, keyed by action `definitionId` then parameter name. */
    actions?: Record<string, Record<string, unknown>>;
    /** Rule priority. Left as the source's when omitted. */
    priority?: number;
    /** Override the source Rule Group, e.g. `exclusiveorderPromotionRuleGroup`. */
    ruleGroup?: string;
    /**
     * Keep one voucher condition and bind it to this Voucher master code. The voucher must already
     * exist; use `ensurePromotionVoucher()` for a promotional voucher, or an existing SerialVoucher
     * master code for a serial voucher.
     */
    voucherCode?: string;
    /**
     * Validity window. **Both are cleared when omitted** - a clone inherits the source's dates, and
     * an expired one publishes as `PUBLISHED` and then fires on nothing with no error anywhere.
     *
     * Give an `endDate` to any rule that must not outlive the run - a couple of hours is enough, and
     * the rule then expires on its own if an undeploy is missed. Start a little in the past: the
     * server's clock is not this machine's.
     */
    startDate?: Date;
    endDate?: Date;
    /**
     * Appends `y_message_display` (or retargets one copied from the source) so the storefront can
     * show the rule code before the discount action itself fires. Reward boost needs this: the
     * boost action is evaluated only after redeem, while the cart Expected Result still wants the
     * configured message. Value is a `TriggerMessageType`, e.g. `REWARDBOOST`.
     */
    displayMessageType?: string;
};

/** Codes, SKUs and catalog names go into the Groovy string as-is, so anything else is refused. */
const SAFE = /^[A-Za-z0-9._/-]+$/;

function quote(value: string, label: string) {
    if (!SAFE.test(value)) throw new Error(`[HAC] Unsafe ${label}: ${value}`);
    return `'${value}'`;
}

const FIND = `
    def find = { String ruleCode ->
        def q = new FlexibleSearchQuery('SELECT {pk} FROM {PromotionSourceRule} WHERE {code} = ?c')
        q.addQueryParameter('c', ruleCode)
        return flexibleSearchService.search(q).result.toList().sort { it.version }
    }
`;

/**
 * Promotion rules through the HAC Groovy console - clone, publish, undeploy. Backoffice does the
 * same work through many fragile ZK interactions (hover-to-reveal chips, currency map confirm
 * buttons, per-locale message rows, a modal that swallows the publish click); this runs as one
 * script that can be rerun.
 *
 * Verified 2026-08-24 on CA (`CA_distributed_discount_on_target_AUTO`) and 2026-08-25 on SG
 * (`SG_fixed_discount_on_product_AUTO`, `SG_product_percentage_discount_AUTO`).
 *
 * Traps this class already handles, and why they are here:
 *
 * - **A clone inherits the source's `startDate`/`endDate`.** An expired source publishes as
 *   `PUBLISHED` and then fires on nothing, with no error anywhere. Both are cleared, and
 *   `rule.endDate = null` is silently ignored so `modelService.setAttributeValue` does it.
 * - **Only the newest version of a code accepts edits** - anything older is refused with
 *   `The modifications are allowed to be made for version [N] only`. Saving and undeploying both
 *   bump the version, so every step looks the versions up again.
 * - **Voucher conditions are dropped unless `voucherCode` is supplied.** An auto-applied rule
 *   cloned from a coupon rule never fires; voucher-driven tests replace the condition instead.
 * - **`compileAndPublishRulesWithBlocking` is never called.** A client timeout on that one left the
 *   module locked for every later publish, in BO too. The non-blocking sibling plus polling is safe.
 *
 * Two rules published in one `publish()` call compile once, which is a minute cheaper than two.
 *
 * `PUBLISHED` is not proof the promotion fires - check `api.getCurrentCartInfo()` and the cart page.
 * Undeploy every rule once the spec passes: a live rule keeps firing on every cart that meets its
 * condition, which is a landmine for other specs.
 */
export class PromotionCollection {
    constructor(private readonly hac: HAC) { }

    /** Every version of a rule code, oldest first. */
    async find(code: string): Promise<RuleVersion[]> {
        const result = await this.hac.executeGroovy(`
            import groovy.json.JsonOutput
            import de.hybris.platform.servicelayer.search.FlexibleSearchQuery
            ${FIND}
            return JsonOutput.toJson(find(${quote(code, 'rule code')}).collect {
                [code: it.code, version: it.version, status: it.status?.code]
            })
        `, false);
        return JSON.parse(result);
    }

    /**
     * Creates an input-able promotional voucher once and returns its master code. PromotionVoucher
     * records are deliberately retained: this type is protected from deletion in shared BO, while
     * the linked rule is always undeployed by the caller after a test.
     */
    /**
     * Creates an input-able promotional voucher once and returns its master code. PromotionVoucher
     * records are deliberately retained: this type is protected from deletion in shared BO, while
     * the linked rule is always undeployed by the caller after a test.
     *
     * `name` is written into localized `name` and `description` (the storefront voucher sub-text)
     * for `en` plus each extra locale.
     */
    async ensurePromotionVoucher(code: string, name?: string, locales: string[] = []): Promise<void> {
        const nameLocales = ['en', ...locales.filter(locale => locale !== 'en')];
        await this.hac.executeGroovy(`
            import de.hybris.platform.servicelayer.search.FlexibleSearchQuery
            def query = new FlexibleSearchQuery('SELECT {pk} FROM {PromotionVoucher} WHERE {code} = ?c')
            query.addQueryParameter('c', ${quote(code, 'voucher code')})
            def found = flexibleSearchService.search(query).result
            def voucher = found ? found[0] : null
            if (!voucher) {
                voucher = modelService.create('PromotionVoucher')
                voucher.code = ${quote(code, 'voucher code')}
                voucher.voucherCode = ${quote(code, 'voucher code')}
            }
            ${name === undefined ? '' : `
            def names = [:]
            ${JSON.stringify(nameLocales)}.each { locale ->
                def parts = locale.split('_')
                names[parts.length > 1 ? new Locale(parts[0], parts[1]) : new Locale(parts[0])] = ${quote(name, 'voucher name')}
            }
            modelService.setAttributeValue(voucher, 'name', names)
            modelService.setAttributeValue(voucher, 'description', names)
            `}
            modelService.save(voucher)
            return voucher.code
        `);
    }

    /**
     * Generates fresh codes for a voucher master and returns them. A serial voucher code can be
     * redeemed once, so a spec that applies one needs a pool it can take from - the same shape as
     * Backoffice's own generate action, which is what `voucherModelService` backs.
     */
    async generateVoucherCodes(voucher: string, count: number): Promise<string[]> {
        if (!Number.isInteger(count) || count < 1) throw new Error(`[HAC] count must be a positive integer, got ${count}`);
        const result = await this.hac.executeGroovy(`
            import groovy.json.JsonOutput
            import de.hybris.platform.servicelayer.search.FlexibleSearchQuery
            def query = new FlexibleSearchQuery('SELECT {pk} FROM {Voucher} WHERE {code} = ?c')
            query.addQueryParameter('c', ${quote(voucher, 'voucher code')})
            def found = flexibleSearchService.search(query).result
            if (!found) { throw new IllegalArgumentException('Voucher does not exist: ${voucher}') }
            def service = spring.getBean('voucherModelService')
            return JsonOutput.toJson((1..${count}).collect { service.generateVoucherCode(found[0]) })
        `);
        return JSON.parse(result);
    }

    /**
     * Clones a rule, points it at `products`, overwrites the action parameters and saves it as a new
     * `UNPUBLISHED` rule. Returns the conditions and actions as stored, so a wrong SKU or an unset
     * currency map shows up here instead of as a silent no-op in the cart.
     *
     * Re-cloning into a code that already exists writes the **next version** of it, the way a
     * Backoffice save does. Rewriting an existing rule is the only way to change one:
     * `PromotionSourceRule` cannot be deleted (`TokoRestrictedTypeRemoveInterceptor` refuses).
     */
    async clone(options: CloneOptions): Promise<{
        code: string, version: number, status: string,
        startDate?: string, endDate?: string, conditions: string, actions: string,
    }> {
        const { source, sourceVersion, code, products, catalog, locales, actions, priority, ruleGroup, voucherCode, startDate, endDate, displayMessageType } = options;
        const skus = products.map(p => quote(p, 'SKU')).join(', ');
        const date = (value?: Date) => value ? `new java.util.Date(${value.getTime()}L)` : 'null';
        const result = await this.hac.executeGroovy(`
            import groovy.json.JsonOutput
            import groovy.json.JsonSlurper
            import de.hybris.platform.ruleengineservices.enums.RuleStatus
            import de.hybris.platform.servicelayer.search.FlexibleSearchQuery
            ${FIND}

            def versions = find(${quote(source, 'source code')})
            def sourceRule = ${sourceVersion === undefined
                ? 'versions.last()'
                : `versions.find { it.version == ${sourceVersion} }`}
            def rule = modelService.clone(sourceRule)
            rule.code = ${quote(code, 'rule code')}
            def previous = find(rule.code)
            rule.version = previous ? previous.last().version + 1 : 0
            rule.status = RuleStatus.UNPUBLISHED
            ${priority === undefined ? '' : `rule.priority = ${priority}`}
            modelService.setAttributeValue(rule, 'startDate', ${date(startDate)})
            modelService.setAttributeValue(rule, 'endDate', ${date(endDate)})

            def slurper = new JsonSlurper()
            def conditions = slurper.parseText(sourceRule.conditions ?: '[]')
            conditions.removeAll { it.definitionId in ['y_qualifying_coupons', 'yes_qualifying_AppliedVouchers'] }
            ${voucherCode === undefined ? '' : `
            def voucherQuery = new FlexibleSearchQuery('SELECT {pk} FROM {Voucher} WHERE {code} = ?c')
            voucherQuery.addQueryParameter('c', ${quote(voucherCode, 'voucher code')})
            def voucher = flexibleSearchService.search(voucherQuery).result.first()
            if (!voucher) throw new IllegalArgumentException('Voucher does not exist: ${voucherCode}')
            conditions << [
                definitionId: 'yes_qualifying_AppliedVouchers',
                parameters: [value: [uuid: java.util.UUID.randomUUID().toString(), type: 'List(ItemType(Voucher))', value: [${quote(voucherCode, 'voucher code')}]]],
                children: []
            ]
            rule.vouchers = [voucher]
            `}
            def skus = [${skus}]
            def next = [0]
            def walk
            walk = { nodes -> nodes.each { node ->
                if (node.parameters?.products != null && next[0] < skus.size()) {
                    node.parameters.products.value = [skus[next[0]] + '::' + ${quote(catalog, 'catalog')}]
                    next[0] = next[0] + 1
                }
                if (node.children) { walk(node.children) }
            } }
            walk(conditions)
            if (next[0] < skus.size()) {
                throw new IllegalStateException("Only \${next[0]} of \${skus.size()} products fit the source conditions")
            }
            rule.conditions = JsonOutput.toJson(conditions)

            def ruleActions = slurper.parseText(sourceRule.actions ?: '[]')
            def patch = slurper.parseText('''${JSON.stringify(actions || {})}''')
            ruleActions.each { action ->
                patch[action.definitionId]?.each { name, value -> action.parameters[name]?.value = value }
            }
            ${displayMessageType === undefined ? '' : `
            def loc = modelService.create('LocalizedString')
            def locValues = [:]
            ${JSON.stringify(locales)}.each { locale ->
                def parts = locale.split('_')
                def locLocale = parts.length > 1 ? new Locale(parts[0], parts[1]) : new Locale(parts[0])
                locValues[locLocale] = rule.code
            }
            locValues[new Locale('en')] = rule.code
            modelService.setAttributeValue(loc, 'string', locValues)
            modelService.save(loc)
            def display = ruleActions.find { it.definitionId == 'y_message_display' }
            if (display) {
                display.parameters.message.value = loc.pk.toString()
                display.parameters.message_type.value = ${quote(displayMessageType, 'display message type')}
            } else {
                ruleActions << [
                    definitionId: 'y_message_display',
                    parameters: [
                        message_type: [uuid: java.util.UUID.randomUUID().toString(), type: 'Enum(com.samsung.toko.core.enums.TriggerMessageType)', value: ${quote(displayMessageType, 'display message type')}],
                        message: [uuid: java.util.UUID.randomUUID().toString(), type: 'ItemType(LocalizedString)', value: loc.pk.toString()]
                    ]
                ]
            }
            `}
            rule.actions = JsonOutput.toJson(ruleActions)

            ${ruleGroup === undefined ? '' : `
            def groupQuery = new FlexibleSearchQuery('SELECT {pk} FROM {RuleGroup} WHERE {code} = ?c')
            groupQuery.addQueryParameter('c', ${quote(ruleGroup, 'rule group')})
            def group = flexibleSearchService.search(groupQuery).result.first()
            if (!group) throw new IllegalArgumentException('Rule Group does not exist: ${ruleGroup}')
            rule.ruleGroup = group
            `}

            rule.setMessageFired(rule.code)
            ${JSON.stringify(locales)}.each { locale ->
                def parts = locale.split('_')
                rule.setMessageFired(rule.code, parts.length > 1 ? new Locale(parts[0], parts[1]) : new Locale(parts[0]))
            }
            modelService.save(rule)
            return JsonOutput.toJson([code: rule.code, version: rule.version, status: rule.status?.code,
                startDate: rule.startDate?.toString(), endDate: rule.endDate?.toString(),
                conditions: rule.conditions, actions: rule.actions])
        `);
        const rule = JSON.parse(result);
        console.log(`[HAC] Cloned ${source} into ${rule.code} v${rule.version}`);
        return rule;
    }

    /**
     * Publishes the newest version of each code into `module` and waits until every one reports
     * `PUBLISHED` (about two and a half minutes for two rules).
     *
     * A code that is still published from an earlier run is undeployed first. Publishing over a
     * live rule leaves two active DroolsRules and the next publish dies on
     * `Duplicate key ... attempted merging values N and N+1`.
     */
    async publish(rules: RuleRef[], module: string, timeout = 300000): Promise<RuleVersion[]> {
        const refs = rules.map(rule => typeof rule === 'string' ? { code: rule, version: null } : rule);
        const codes = refs.map(ref => quote(ref.code, 'rule code') && ref.code);
        const live = (await Promise.all(codes.map(code => this.find(code)))).flat()
            .filter(rule => rule.status === 'PUBLISHED')
            .map(rule => rule.code);
        if (live.length) await this.undeploy([...new Set(live)], module, timeout);
        await this.hac.executeGroovy(`
            import groovy.json.JsonSlurper
            import de.hybris.platform.servicelayer.search.FlexibleSearchQuery
            ${FIND}
            def refs = new JsonSlurper().parseText('''${JSON.stringify(refs)}''')
            ruleMaintenanceService.compileAndPublishRules(refs.collect { ref ->
                def versions = find(ref.code)
                def rule = ref.version == null ? versions.last() : versions.find { it.version == ref.version }
                if (rule == null) { throw new IllegalStateException("No \${ref.code} v\${ref.version}") }
                return rule
            }, ${quote(module, 'module')}, true)
            return 'publish requested'
        `);
        return this.waitFor(codes, versions => versions.some(v => v.status === 'PUBLISHED'), timeout,
            `Rules did not reach PUBLISHED: ${codes.join(', ')}`);
    }

    /**
     * Undeploys **every** version of each code and waits until none of them is `PUBLISHED`. Every
     * one, because the published version is not always the newest - `publish()` takes a pinned one.
     */
    async undeploy(codes: string[], module: string, timeout = 300000): Promise<RuleVersion[]> {
        // Quoted one at a time: a JSON array pasted into Groovy source is a list of GStrings, and a
        // dollar-brace expression inside one of them would run server-side. quote() refuses those.
        const list = codes.map(code => quote(code, 'rule code')).join(', ');
        await this.hac.executeGroovy(`
            import de.hybris.platform.servicelayer.search.FlexibleSearchQuery
            ${FIND}
            [${list}].each { ruleMaintenanceService.undeployRules(find(it), ${quote(module, 'module')}) }
            return 'undeploy requested'
        `);
        return this.waitFor(codes, versions => versions.every(v => v.status !== 'PUBLISHED'), timeout,
            `Rules are still PUBLISHED: ${codes.join(', ')}`);
    }

    private async waitFor(codes: string[], done: (versions: RuleVersion[]) => boolean, timeout: number, error: string) {
        const deadline = Date.now() + timeout;
        while (true) {
            const rules = (await Promise.all(codes.map(code => this.find(code)))).flat();
            if (codes.every(code => done(rules.filter(r => r.code === code)))) {
                console.log('[HAC] ' + rules.map(r => `${r.code} v${r.version}=${r.status}`).join(', '));
                return rules;
            }
            if (Date.now() > deadline) throw new Error(`[HAC] ${error}`);
            console.log('[HAC] waiting for status ' + codes.join(', '));
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

export default PromotionCollection;
