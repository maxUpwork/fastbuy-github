import { NextResponse } from 'next/server';

type ChainItem = {
    id: string;
    title: string;
    category: string;         // "1 PHASE" | "2 PHASE" | ...
    initialBalance: number;   // 2000 | 5000 | ...
    price?: number | null;
    challengeTypeId: string;  // ВАЖНО: будем слать его
    accountType?: { platformInfo?: { type?: string; name?: string } };
};

type Upsale = {
    id: string;
    challengeTypeId: string;     // Базовый CT для которого создана услуга
    title: string;               // Читабельное имя (для option)
    condition: string;           // Ключ группы: profitTarget, weekendTradingAllowed, ...
    price?: number;
    values?: Array<{ value: number | string | boolean; challengeTypeId: string }>;
};

type ChainsPayload = {
    success?: boolean;
    data?: Array<{ chain: ChainItem[]; upsales?: Upsale[] }>;
};

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    // Примеры для payment/promo — оставим как раньше
    if (type === 'payment') {
        // Тянем мерчантов с вашего Swagger-бэка
        const r = await fetch(`${process.env.BACKEND_URL}/ninja-merchants`, {
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.BACKEND_KEY ? { 'X-API-Key': process.env.BACKEND_KEY } : {}),
            },
            // next: { revalidate: 60 }, // опционально: кешировать 60с
        });

        if (!r.ok) {
            return NextResponse.json({ methods: [] }, { status: 200 }); // мягко отдадим пустой список
        }

        type NinjaMerchantsResp = {
            success: boolean;
            data?: {
                cabinetId?: string;
                merchants?: Array<{
                    id: number;
                    name: string;           // "Coinsbuy"
                    slug: string;           // "coinsbuy"
                    displayName?: string | null; // "USDT TRC20"
                    imagePath?: string | null;   // относительный путь
                    currency?: string[];    // ["usdt_trx"] или ["usd"] и т.п.
                    integrationId?: number | null;
                    openNewTab?: boolean;
                    hasExternalRedirect?: boolean;
                }>;
            };
        };

        const j = (await r.json()) as NinjaMerchantsResp;
        const list = j?.data?.merchants ?? [];

        // Трансформируем в удобный массив методов.
        // В исходном JSON один и тот же merchant (id/slug) может встречаться
        // несколько раз с разной currency — сделаем уникальные варианты по (slug + currency).
        const seen = new Set<string>();
        const methods = list.flatMap((m) => {
            const currencies = Array.isArray(m.currency) && m.currency.length ? m.currency : [''];
            return currencies.map((cur) => {
                const key = `${m.slug}:${cur || 'nocur'}`;
                if (seen.has(key)) return null;
                seen.add(key);

                // Человекочитаемая подпись
                const curLabel = cur ? cur.toUpperCase() : '';
                const title =
                    m.displayName
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
        }).filter(Boolean);

        return NextResponse.json({ methods });
    }

    if (type === 'promo') {
        const code = searchParams.get('code') || '';
        return NextResponse.json({ ok: true, message: `Promo applied: ${code.toUpperCase()}` });
    }

    // Тянем chains + upsales из Swagger
    const upstream = await fetch(`${process.env.BACKEND_URL}/v3/challenge-types/chains`, {
        headers: {
            'Content-Type': 'application/json',
            ...(process.env.BACKEND_KEY ? { 'X-API-Key': process.env.BACKEND_KEY } : {}),
        },
    });
    if (!upstream.ok) {
        return NextResponse.json({ error: 'Failed to fetch chains' }, { status: 502 });
    }
    const json = (await upstream.json()) as ChainsPayload;
    const blocks = json.data ?? [];

    const chains: ChainItem[] = blocks.flatMap((b) => b.chain || []);
    const upsales: Upsale[] = blocks.flatMap((b) => b.upsales || []);

    // Списки для радиокнопок
    const platforms = Array.from(
        new Set(chains.map((c) => c.accountType?.platformInfo?.type).filter(Boolean))
    ) as string[];

    const challenges = Array.from(
        new Set(chains.map((c) => c.category).filter(Boolean))
    ).sort();

    const capitals = Array.from(
        new Set(chains.map((c) => c.initialBalance).filter((v): v is number => typeof v === 'number'))
    ).sort((a, b) => a - b);

    // Каталог (важно: challengeTypeId!)
    const catalog = chains.map((c) => ({
        id: c.id,
        challengeTypeId: c.challengeTypeId,
        title: c.title,
        platform: (c.accountType?.platformInfo?.type || '').toUpperCase(), // "MT5"|"MATCHTRADER"|...
        challenge: c.category,                   // "1 PHASE"|...
        capital: c.initialBalance,               // 2000|5000|...
        price: typeof c.price === 'number' ? c.price : null,
    }));

    // Отдаём ещё и «сырые» upsales (клиент отфильтрует их под выбранный challengeTypeId)
    return NextResponse.json({ platforms, challenges, capitals, catalog, upsales });
}
