// src/app/api/promo/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { challengeTypeId, promoCode } = await req.json();

        if (!challengeTypeId || !promoCode) {
            return NextResponse.json({ error: 'challengeTypeId and promoCode are required' }, { status: 400 });
        }

        const body = { challengeTypeId, promoCode };

        // Логируем тело запроса (осторожно: PII)
        const DEBUG = process.env.DEBUG_PAYMENTS !== '0';
        if (DEBUG) {
            console.log('--- promo-code REQUEST BODY ---');
            console.log(JSON.stringify(body, null, 2));
            console.log('--------------------------------');
        }

        const r = await fetch(`${process.env.BACKEND_URL || 'https://swagger.kenmorefx.com/api-2'}/challenge-type/promo-code`, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                ...(process.env.BACKEND_KEY ? { 'X-API-Key': process.env.BACKEND_KEY } : {}),
            },
            body: JSON.stringify(body),
        });

        const raw = await r.text();
        if (DEBUG) {
            console.log('--- promo-code RAW RESPONSE ---');
            console.log(`HTTP ${r.status} ${r.statusText}`);
            console.log(raw);
            console.log('--------------------------------');
        }

        if (!r.ok) {
            return NextResponse.json({ error: 'Upstream error', upstreamRaw: raw }, { status: 502 });
        }

        let json: any = null;
        try { json = raw ? JSON.parse(raw) : null; } catch { }

        const price = json?.data?.price;
        if (typeof price !== 'number') {
            return NextResponse.json({ error: 'No price in response', upstreamRaw: raw }, { status: 502 });
        }

        return NextResponse.json({ ok: true, price, upstreamRaw: raw });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
    }
}
