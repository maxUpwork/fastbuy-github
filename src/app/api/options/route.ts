// src/app/api/options/route.ts
import { NextResponse } from 'next/server';

type ChainItem = {
    id: string;
    title: string;
    category: string;
    initialBalance: number;
    price?: number | null;
    challengeTypeId: string;
    accountType?: { platformInfo?: { type?: string; name?: string } };

    // возможные контейнеры правил
    settings?: any;
    rules?: any;
    conditions?: any;
    metrics?: any;

    // возможные прямые поля
    permittedDailyLoss?: number | string;
    permittedTotalLoss?: number | string;
    profitableDays?: number | string;
    duration?: number | string;
};

type Upsale = {
    id: string;
    challengeTypeId: string;
    title: string;
    condition: string;
    price?: number;
    values?: Array<{ value: number | string | boolean; challengeTypeId: string }>;
};

type ChainsPayload = {
    success?: boolean;
    data?: Array<{ chain: ChainItem[]; upsales?: Upsale[] }>;
};

// ---------- helpers ----------
function pick(obj: any, paths: Array<string | string[]>): any {
    for (const p of paths) {
        if (Array.isArray(p)) {
            for (const key of p) {
                if (obj && obj[key] != null) return obj[key];
            }
        } else {
            let cur = obj;
            const segs = p.split('.');
            for (const s of segs) {
                if (cur == null) break;
                cur = cur[s];
            }
            if (cur != null) return cur;
        }
    }
    return null;
}

function toNumberOrNull(v: any): number | null {
    if (v == null) return null;
    const n = Number(String(v).replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : null;
}

function normPlatform(t: string | undefined) {
    const v = (t || '').toUpperCase();
    if (v.includes('MT5')) return 'MT5';
    if (v.includes('MATCH')) return 'MATCHTRADER';
    return (t || '').toUpperCase();
}

// ---------- route ----------
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    // -------- payment methods --------
    if (type === 'payment') {
        const r = await fetch(`${process.env.BACKEND_URL}/ninja-merchants`, {
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.BACKEND_KEY ? { 'X-API-Key': process.env.BACKEND_KEY } : {}),
            },
        });

        if (!r.ok) {
            return NextResponse.json({ methods: [] }, { status: 200 });
        }

        type NinjaMerchantsResp = {
            success: boolean;
            data?: {
                cabinetId?: string;
                merchants?: Array<{
                    id: number;
                    name: string;
                    slug: string;
                    displayName?: string | null;
                    imagePath?: string | null;
                    currency?: string[];
                    integrationId?: number | null;
                    openNewTab?: boolean;
                    hasExternalRedirect?: boolean;
                }>;
            };
        };

        const j = (await r.json()) as NinjaMerchantsResp;
        const list = j?.data?.merchants ?? [];

        const seen = new Set<string>();
        const methods = list
            .flatMap((m) => {
                const currencies = Array.isArray(m.currency) && m.currency.length ? m.currency : [''];
                return currencies.map((cur) => {
                    const key = `${m.slug}:${cur || 'nocur'}`;
                    if (seen.has(key)) return null;
                    seen.add(key);

                    const curLabel = cur ? cur.toUpperCase() : '';
                    const title = m.displayName
                        ? `${m.name}${curLabel ? ` — ${m.displayName} (${curLabel})` : ` — ${m.displayName}`}`
                        : `${m.name}${curLabel ? ` — ${curLabel}` : ''}`;

                    return {
                        id: `${m.id}:${cur}`,
                        merchantId: m.id,
                        slug: m.slug,
                        currency: cur || null,
                        integrationId: m.integrationId ?? null,
                        title,
                        imageUrl: m.imagePath
                            ? (m.imagePath.startsWith('http')
                                ? m.imagePath
                                : `https://swagger.kenmorefx.com${m.imagePath}`)
                            : null,
                        openNewTab: !!m.openNewTab,
                        external: !!m.hasExternalRedirect,
                    };
                });
            })
            .filter(Boolean);

        return NextResponse.json({ methods });
    }

    if (type === 'promo') {
        const code = searchParams.get('code') || '';
        return NextResponse.json({ ok: true, message: `Promo applied: ${code.toUpperCase()}` });
    }

    // -------- chains + upsales --------
    const upstream = await fetch(`${process.env.BACKEND_URL}/v3/challenge-types/chains`, {
        headers: {
            'Content-Type': 'application/json',
            ...(process.env.BACKEND_KEY ? { 'X-API-Key': process.env.BACKEND_KEY } : {}),
        },
        cache: 'no-store',
    });

    if (!upstream.ok) {
        const raw = await upstream.text();
        console.log('chains upstream error:', upstream.status, raw);
        return NextResponse.json({ error: 'Failed to fetch chains' }, { status: 502 });
    }

    const json = (await upstream.json()) as ChainsPayload;
    const blocks = json.data ?? [];

    const chains: ChainItem[] = blocks.flatMap((b) => b.chain || []);
    const upsales: Upsale[] = blocks.flatMap((b) => b.upsales || []);

    // агрегированные списки
    const platforms = Array.from(
        new Set(chains.map((c) => c.accountType?.platformInfo?.type).filter(Boolean))
    ) as string[];

    const challenges = Array.from(
        new Set(chains.map((c) => c.category).filter(Boolean))
    ).sort();

    const capitals = Array.from(
        new Set(
            chains
                .map((c) => c.initialBalance)
                .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
        )
    ).sort((a, b) => a - b);

    // счётчики для итоговой статистики
    let cntDaily = 0,
        cntTotal = 0,
        cntDays = 0,
        cntDuration = 0,
        cntPrice = 0;

    const catalog = chains.map((c, idx) => {
        const platform = normPlatform(c.accountType?.platformInfo?.type);

        const price =
            typeof c.price === 'number'
                ? c.price
                : toNumberOrNull((c as any).price ?? (c as any).oneTimeFee);

        // permittedDailyLoss → Max Loss per day
        const permittedDailyLoss = pick(c, [
            'permittedDailyLoss',
            'settings.permittedDailyLoss',
            'rules.permittedDailyLoss',
            'conditions.permittedDailyLoss',
            'metrics.permittedDailyLoss',
            'settings.dailyLoss',
            'rules.dailyLoss',
            'conditions.dailyLoss',
            'settings.maxDailyLoss',
            'rules.maxDailyLoss',
            'conditions.maxDailyLoss',
        ]);

        // permittedTotalLoss → Max Drawdown
        const permittedTotalLoss = pick(c, [
            'permittedTotalLoss',
            'settings.permittedTotalLoss',
            'rules.permittedTotalLoss',
            'conditions.permittedTotalLoss',
            'metrics.permittedTotalLoss',
            'settings.totalLoss',
            'rules.totalLoss',
            'conditions.totalLoss',
            'settings.maxDrawdown',
            'rules.maxDrawdown',
            'conditions.maxDrawdown',
        ]);

        // profitableDays → Min Trading Days
        const profitableDaysRaw = pick(c, [
            'profitableDays',
            'settings.profitableDays',
            'rules.profitableDays',
            'conditions.profitableDays',
            'settings.minTradingDays',
            'rules.minTradingDays',
            'conditions.minTradingDays',
            'settings.minimumTradingDays',
            'rules.minimumTradingDays',
            'conditions.minimumTradingDays',
        ]);
        const profitableDays = profitableDaysRaw != null ? Number(profitableDaysRaw) : null;

        // duration → Trading period
        const durationRaw = pick(c, [
            'duration',
            'settings.duration',
            'rules.duration',
            'conditions.duration',
            'metrics.duration',
            'settings.tradingPeriod',
            'rules.tradingPeriod',
            'conditions.tradingPeriod',
            'settings.tradingPeriodDays',
            'rules.tradingPeriodDays',
            'conditions.tradingPeriodDays',
        ]);
        const duration = durationRaw != null ? Number(durationRaw) : null;

        // ---- подробный лог для каждого элемента ----
        const one = {
            idx,
            challengeTypeId: c.challengeTypeId,
            platform,
            category: c.category,
            capital: c.initialBalance,
            // то, что уйдёт в таблицу
            maxLossPerDay__permittedDailyLoss: permittedDailyLoss,
            maxDrawdown__permittedTotalLoss: permittedTotalLoss,
            minTradingDays__profitableDays: profitableDays,
            tradingPeriod__duration: duration,
            oneTimeFee__price: price,
        };
        console.log('[chains:map]', JSON.stringify(one));

        // статистика заполненности
        if (permittedDailyLoss != null && permittedDailyLoss !== 0 && permittedDailyLoss !== '0') cntDaily++;
        if (permittedTotalLoss != null && permittedTotalLoss !== 0 && permittedTotalLoss !== '0') cntTotal++;
        if (profitableDays != null && profitableDays !== 0) cntDays++;
        if (duration != null && duration !== 0) cntDuration++;
        if (price != null && price !== 0) cntPrice++;

        return {
            id: c.id,
            challengeTypeId: c.challengeTypeId,
            title: c.title,
            platform,
            challenge: c.category,
            capital: c.initialBalance,
            price,

            // поля для таблицы
            permittedDailyLoss,
            permittedTotalLoss,
            profitableDays,
            duration,
        };
    });

    // итоговая сводка по заполненности
    console.log('[chains:summary]', {
        totalChains: catalog.length,
        withDailyLoss: cntDaily,
        withTotalLoss: cntTotal,
        withProfitableDays: cntDays,
        withDuration: cntDuration,
        withPrice: cntPrice,
    });

    return NextResponse.json({ platforms, challenges, capitals, catalog, upsales });
}
