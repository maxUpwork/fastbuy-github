// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';

function toUpperOrDefault(v: string | null | undefined, d: string) {
    return (v ?? d).toString().toUpperCase();
}
function toLowerOrDefault(v: string | null | undefined, d: string) {
    return (v ?? d).toString().toLowerCase();
}

export async function POST(req: Request) {
    try {
        const payload = await req.json();

        // ====== Валидация входа ======
        const sel = payload?.selection;
        const cust = payload?.customer;
        const pay = payload?.payment;

        if (!sel?.challengeTypeId) {
            return NextResponse.json({ error: 'challengeTypeId is required' }, { status: 400 });
        }
        if (!cust?.email || !cust?.firstName || !cust?.lastName || !cust?.password || !cust?.confirmPassword || !cust?.country) {
            return NextResponse.json({ error: 'Missing customer required fields' }, { status: 400 });
        }
        if (!pay?.merchantId || !pay?.slug) {
            return NextResponse.json({ error: 'Payment merchant is required' }, { status: 400 });
        }

        // ====== Сумма ======
        const amount: number = Number(payload?.amount ?? 0);
        if (!amount || Number.isNaN(amount)) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // ====== Валюта ======
        const currencyUpper = toUpperOrDefault(pay?.currency, process.env.DEFAULT_CURRENCY || 'USD'); // "USD"
        const currencyLower = toLowerOrDefault(pay?.currency, process.env.DEFAULT_CURRENCY ? process.env.DEFAULT_CURRENCY.toLowerCase() : 'usd'); // "usd"

        // ====== Доп. поля ======
        const promoCode: string | null = sel?.promo ?? null;
        const regionId = process.env.REGION_ID;
        if (!regionId) {
            return NextResponse.json({ error: 'REGION_ID is not configured' }, { status: 500 });
        }
        const leverage = Number(process.env.DEFAULT_LEVERAGE || 100);
        const integrationId = pay?.integrationId ?? null;

        // ====== Тело запроса для /v3/challenge-promo ======
        const body = {
            traderData: {
                firstName: cust.firstName,
                lastName: cust.lastName,
                email: cust.email,
                phone: cust.phone ?? null,
                language: cust.language ?? 'en',
                password: cust.password,
                confirmPassword: cust.confirmPassword,
                affiliate: null,
                promoCode: promoCode,
                country: cust.country, // ISO: "UA","PL","ES",...
            },
            merchant: pay.slug,                // "yobopay" | "coinsbuy" | ...
            merchantId: pay.merchantId,        // number
            integrationId: integrationId,      // number | null
            challengeTypeId: sel.challengeTypeId,
            currency: currencyUpper,           // "USD"
            originalCurrency: currencyLower,   // "usd"
            amount: amount,                    // number
            leverage: leverage,                // 100
            regionId: regionId,                // string
        };

        // ====== Лог: тело запроса ======
        const DEBUG = process.env.DEBUG_PAYMENTS !== '0';
        if (DEBUG) {
            console.log('--- challenge-promo REQUEST BODY ---');
            console.log(JSON.stringify(body, null, 2));
            console.log('------------------------------------');
        }

        // ====== Вызов продового эндпоинта ======
        const upstreamResp = await fetch(`${process.env.BACKEND_URL || 'https://swagger.kenmorefx.com/api-2'}/v3/challenge-promo`, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                ...(process.env.BACKEND_KEY ? { 'X-API-Key': process.env.BACKEND_KEY } : {}),
            },
            body: JSON.stringify(body),
        });

        // ====== Сырой ответ (лог) ======
        const upstreamRaw = await upstreamResp.text();
        if (DEBUG) {
            console.log('--- challenge-promo RAW RESPONSE ---');
            console.log(`HTTP ${upstreamResp.status} ${upstreamResp.statusText}`);
            console.log(upstreamRaw);
            console.log('------------------------------------');
        }

        // Парс как JSON (если возможно)
        let upstream: any = null;
        try {
            upstream = upstreamRaw ? JSON.parse(upstreamRaw) : null;
        } catch {
            upstream = null; // оставим raw строкой ниже
        }

        if (!upstreamResp.ok) {
            return NextResponse.json(
                { error: 'Upstream error', status: upstreamResp.status, upstreamRaw },
                { status: 502 }
            );
        }

        // ====== Извлечение redirectUrl из всех известных форм ======
        const redirectUrl =
            upstream?.data?.response?.outputData?.redirectUrl || // старый формат
            upstream?.data?.redirectUrl ||                       // фактический формат из лога
            upstream?.data?.outputData?.redirectUrl ||
            upstream?.redirectUrl ||
            null;

        const successUrl = upstream?.data?.successUrl || null;
        const pendingUrl = upstream?.data?.pendingUrl || null;
        const errorUrl = upstream?.data?.errorUrl || null;

        if (redirectUrl) {
            return NextResponse.json({
                ok: true,
                redirectUrl,
                successUrl,
                pendingUrl,
                errorUrl,
                upstreamRaw, // оставим для дебага
            });
        }

        // Если нет прямого redirectUrl — вернём запасные URL
        return NextResponse.json({
            ok: true,
            successUrl,
            pendingUrl,
            errorUrl,
            upstreamRaw,
        });
    } catch (e: any) {
        console.error('checkout handler error:', e);
        return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
    }
}
