'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

type PaymentMethod = {
    id: string;
    merchantId: number;
    slug: string;
    currency: string | null;
    integrationId: number | null;
    title: string;
    imageUrl: string | null;
    openNewTab: boolean;
    external: boolean;
};

type CatalogItem = {
    id: string;
    challengeTypeId: string;
    title: string;
    platform: string;
    challenge: string;
    capital: number;
    price: number | null;
    permittedDailyLoss?: number | string | null;
    permittedTotalLoss?: number | string | null;
    profitableDays?: number | null;
    duration?: number | null;
};

type Upsale = {
    id: string;
    challengeTypeId: string;
    title: string;
    condition: string;
    price?: number;
    values?: Array<{ value: number | string | boolean; challengeTypeId: string }>;
};

const UPSALE_LABEL: Record<string, string> = {
    profitTarget: 'Get Additional Profit Target',
    minimumDaysWithTradingHistory: 'Get Additional Min Days',
    dailyPercentage: 'Get Additional Daily Percentage',
    totalPercentage: 'Get Additional Total Percentage',
    percentForWithdrawal: 'Get Additional Percentage for Withdrawal',
    firstWithdrawalDays: 'Get Additional Days for First Withdrawal',
    consecutiveWithdrawalDays: 'Get Additional Days for Consecutive Withdrawal',
    consistencyRule: 'Consistency Rule',
    tradingNews: 'Get Subscription for Trading News',
    weekendTradingAllowed: 'Allow to Trade on Weekends',
};

export default function FastBuy() {
    const searchParams = useSearchParams();

    const [platforms, setPlatforms] = useState<string[]>([]);
    const [challenges, setChallenges] = useState<string[]>([]);
    const [capitals, setCapitals] = useState<number[]>([]);
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [upsales, setUpsales] = useState<Upsale[]>([]);
    const [methods, setMethods] = useState<PaymentMethod[]>([]);

    const [platform, setPlatform] = useState<string>('ALL');
    const [challenge, setChallenge] = useState<string>('');
    const [capital, setCapital] = useState<number | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('');

    const [promo, setPromo] = useState('');
    const [promoHint, setPromoHint] = useState('');
    const [promoPrice, setPromoPrice] = useState<number | null>(null);
    const [promoError, setPromoError] = useState<boolean>(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState('');
    const [language, setLanguage] = useState('en');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [agree, setAgree] = useState(false);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const [selectedUpsales, setSelectedUpsales] = useState<Record<string, string>>({});

    useEffect(() => {
        (async () => {
            const base = await fetch('/api/options').then(r => r.json());
            setPlatforms(base.platforms || []);
            setChallenges(base.challenges || []);
            setCapitals(base.capitals || []);
            setCatalog(base.catalog || []);
            setUpsales(base.upsales || []);
            if (!challenge && base.challenges?.length) setChallenge(base.challenges[0]);
            if (capital == null && base.capitals?.length) setCapital(base.capitals[0]);
            const pm = await fetch('/api/options?type=payment').then(r => r.json());
            if (Array.isArray(pm?.methods)) {
                setMethods(pm.methods);
                if (!paymentMethod && pm.methods[0]) setPaymentMethod(pm.methods[0].id);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const current = useMemo(() => {
        const candidates = catalog.filter(
            i =>
                (!challenge || i.challenge === challenge) &&
                (capital == null || i.capital === capital) &&
                (platform === 'ALL' || i.platform === platform)
        );
        if (candidates.length === 0) return null;
        if (platform !== 'ALL') return candidates[0];
        const prefer = ['MT5', 'MATCHTRADER'];
        for (const pf of prefer) {
            const hit = candidates.find(c => c.platform === pf);
            if (hit) return hit;
        }
        return candidates[0];
    }, [catalog, platform, challenge, capital]);

    const currentChallengeTypeId = current?.challengeTypeId || '';

    useEffect(() => {
        setPromoPrice(null);
        setPromoError(false);
        setPromoHint('');
    }, [currentChallengeTypeId]);

    const upsalesByCondition = useMemo(() => {
        const map = new Map<string, { label: string; options: { id: string; text: string }[] }>();
        const relevant = upsales.filter(
            u =>
                u.challengeTypeId === currentChallengeTypeId ||
                (u.values || []).some(v => v.challengeTypeId === currentChallengeTypeId)
        );
        for (const u of relevant) {
            const label = UPSALE_LABEL[u.condition] || u.condition;
            const text = u.title + (typeof u.price === 'number' ? ` (+$${u.price})` : '');
            if (!map.has(u.condition)) map.set(u.condition, { label, options: [] });
            map.get(u.condition)!.options.push({ id: u.id, text });
        }
        for (const group of map.values()) {
            group.options.sort((a, b) => a.text.localeCompare(b.text));
            group.options.unshift({ id: '', text: 'Select' });
        }
        return map;
    }, [upsales, currentChallengeTypeId]);

    function platformLabel(p: string) {
        if (p?.toUpperCase() === 'MT5') return 'Meta Trader 5';
        if (p?.toUpperCase() === 'MATCHTRADER') return 'Match-Trader';
        return p;
    }

    function formatMoneyShort(n: number) {
        if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 ? 1 : 0)}b`;
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}m`;
        if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? (n < 10_000 ? 1 : 0) : 0)}k`;
        return `${n}`;
    }

    function fmtUsd(x: number | string | null | undefined) {
        if (x == null || x === '') return '—';
        const n = typeof x === 'string' ? Number(x) : x;
        if (!isFinite(n)) return String(x);
        return `$${formatMoneyShort(n)}`;
    }

    function fmtDays(x: number | string | null | undefined) {
        if (x == null || x === '') return '—';
        const n = typeof x === 'string' ? Number(x) : x;
        if (!isFinite(n)) return String(x);
        return `${n} day${Number(n) === 1 ? '' : 's'}`;
    }

    const usdNoGroup = new Intl.NumberFormat(undefined, {
        useGrouping: false,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
    function formatUSD(n: number) {
        return `$${usdNoGroup.format(n)}`;
    }

    const totalPrice = useMemo(() => {
        // базовая цена -> в центы
        const baseRaw =
            promoPrice ??
            (typeof current?.price === "number" ? current.price : (capital ?? 0));

        let cents = Math.round((baseRaw || 0) * 100);

        for (const upsaleId of Object.values(selectedUpsales)) {
            if (!upsaleId) continue;
            const u = upsales.find((x) => x.id === upsaleId);
            if (u && typeof u.price === "number" && isFinite(u.price)) {
                cents += Math.round(u.price * 100);
            }
        }

        const total = cents / 100;
        return formatUSD(total);
    }, [promoPrice, current, capital, selectedUpsales, upsales]);

    function computeErrors() {
        const e: Record<string, string> = {};
        if (!firstName.trim()) e.firstName = 'First name is required.';
        if (!lastName.trim()) e.lastName = 'Last name is required.';
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) e.email = 'Email is required.';
        else if (!emailRe.test(email)) e.email = 'Enter a valid email address';
        const phoneRe = /^[\d\s+().-]{7,}$/;
        if (!phone.trim()) e.phone = 'Phone is required.';
        else if (!phoneRe.test(phone)) e.phone = 'Enter a valid phone number';
        if (!country) e.country = 'Select a country';
        const passRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*\-]).{8,}$/;
        if (!password) e.password = 'Password is required.';
        else if (!passRe.test(password)) e.password = 'Min 8 chars, uppercase, lowercase, number and special (!@#$%^&*-)';
        if (!password2) e.password2 = 'Confirm your password';
        else if (password2 !== password) e.password2 = 'Passwords do not match';
        if (!paymentMethod) e.paymentMethod = 'Select a payment method';
        if (!agree) e.agree = 'You must accept Terms and Conditions';
        return e;
    }

    const isFormValid = useMemo(
        () => Object.keys(computeErrors()).length === 0,
        [firstName, lastName, email, phone, country, password, password2, paymentMethod, agree]
    );

    useEffect(() => {
        setErrors(computeErrors());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firstName, lastName, email, phone, country, password, password2, paymentMethod, agree]);

    const markTouched = (name: string) => setTouched(p => ({ ...p, [name]: true }));
    const showError = (name: string) => !!errors[name] && !!touched[name];

    const basePlatform = useMemo(
        () => (platform === 'ALL' ? current?.platform : platform),
        [platform, current?.platform]
    );

    const v1 = useMemo(
        () =>
            catalog.find(
                v =>
                    v.platform === basePlatform &&
                    v.capital === capital &&
                    (v.challenge?.toUpperCase().includes('1') || v.challenge?.toUpperCase().includes('ONE'))
            ),
        [catalog, basePlatform, capital]
    );

    const v2 = useMemo(
        () =>
            catalog.find(
                v =>
                    v.platform === basePlatform && v.capital === capital && v.challenge?.toUpperCase().includes('2')
            ),
        [catalog, basePlatform, capital]
    );

    const vMaster = useMemo(
        () =>
            catalog.find(
                v =>
                    v.platform === basePlatform &&
                    v.capital === capital &&
                    /(MASTER|MASTERS?|XFINE\s*MASTER|PHASE\s*3|3\s*PHASE)/i.test(v.challenge || '')
            ),
        [catalog, basePlatform, capital]
    );

    function pick<K extends keyof CatalogItem>(item: CatalogItem | null | undefined, key: K) {
        return item ? item[key] : null;
    }

    const applyPromo = useCallback(async () => {
        setPromoError(false);
        if (!currentChallengeTypeId) {
            setPromoHint('Select Platform / Challenge / Capital first');
            setPromoError(true);
            return;
        }
        if (!promo.trim()) {
            setPromoHint('Enter promo code');
            setPromoError(true);
            return;
        }
        try {
            const res = await fetch('/api/promo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challengeTypeId: currentChallengeTypeId, promoCode: promo.trim() }),
            });
            const data = await res.json();
            if (!res.ok || !data?.ok || typeof data?.price !== 'number') {
                setPromoHint(data?.error || 'Promo code is invalid');
                setPromoError(true);
                setPromoPrice(null);
                return;
            }
            setPromoPrice(data.price);
            setPromoHint(`Promo applied. New price: $${data.price}`);
            setPromoError(false);
        } catch {
            setPromoHint('Promo check failed. Try again later');
            setPromoError(true);
            setPromoPrice(null);
        }
    }, [currentChallengeTypeId, promo]);

    useEffect(() => {
        if (!searchParams) return;
        const haveBase = platforms.length > 0 && challenges.length > 0 && capitals.length > 0;
        if (!haveBase) return;
        const norm = (s: string) => s.trim().toLowerCase();
        const qp = (name: string) => {
            const v = searchParams.get(name);
            return v && v.trim() ? v.trim() : null;
        };
        const qpPromo = qp('promo') || qp('promocode') || qp('code');
        if (qpPromo) {
            setPromo(qpPromo);
            setPromoError(false);
            setPromoHint('');
        }
        const qpPlatform = qp('platform');
        if (qpPlatform) {
            const v = norm(qpPlatform);
            if (v === 'all') setPlatform('ALL');
            else {
                const found = platforms.find(p => norm(p) === v || norm(p).replace(/\s+/g, '') === v);
                if (found) setPlatform(found);
            }
        }
        const qpChallenge = qp('challenge');
        if (qpChallenge) {
            const v = norm(qpChallenge);
            const found = challenges.find(c => norm(c) === v);
            if (found) setChallenge(found);
        }
        const qpCapital = qp('capital');
        if (qpCapital) {
            const n = Number(qpCapital.replace(/[^\d.-]/g, ''));
            if (Number.isFinite(n)) {
                const found = capitals.find(x => x === n);
                if (found != null) setCapital(found);
            }
        }
        const qpApply = qp('applyPromo');
        if (qpApply === '1') setTimeout(() => { void applyPromo(); }, 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, platforms, challenges, capitals, applyPromo]);

    async function checkout() {
        if (!isFormValid) {
            setTouched({
                firstName: true, lastName: true, email: true, phone: true,
                country: true, password: true, password2: true,
                paymentMethod: true, agree: true,
            });
            return;
        }
        if (!current?.challengeTypeId) {
            alert('Select valid Platform/Challenge/Capital');
            return;
        }
        let amount = promoPrice ?? (typeof current?.price === 'number' ? current.price : (capital ?? 0));
        for (const upsaleId of Object.values(selectedUpsales)) {
            if (!upsaleId) continue;
            const u = upsales.find(x => x.id === upsaleId);
            if (u && typeof u.price === 'number') amount += u.price;
        }
        if (!amount) {
            alert('Unable to calculate amount');
            return;
        }
        const pmObj = methods.find(m => m.id === paymentMethod);
        if (!pmObj) {
            alert('Select a payment method');
            return;
        }
        const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                selection: { challengeTypeId: current.challengeTypeId, promo: promo || null },
                customer: { firstName, lastName, email, phone, country, language, password, confirmPassword: password2 },
                payment: { merchantId: pmObj.merchantId, slug: pmObj.slug, currency: pmObj.currency, integrationId: pmObj.integrationId },
                amount,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Checkout failed');
        if (data?.redirectUrl) {
            window.location.href = data.redirectUrl;
        } else if (data?.successUrl || data?.pendingUrl || data?.errorUrl) {
            window.location.href = data.successUrl || data.pendingUrl || data.errorUrl;
        } else {
            alert('Order created, but no redirectUrl returned');
        }
    }

    return (
        <div className="challenge-buy">
            <div className="challenge-buy__options">
                <div className="challenge-buy__title">Platform</div>
                <div className="challenge-buy__options-group" id="platform-group">
                    <div className="challenge-buy__options-input">
                        <input
                            type="radio"
                            name="platform"
                            id="platform-all"
                            value="ALL"
                            checked={platform === 'ALL'}
                            onChange={() => setPlatform('ALL')}
                        />
                        <label htmlFor="platform-all">All</label>
                    </div>
                    {platforms.map(p => {
                        const id = `platform-${p.toLowerCase()}`;
                        return (
                            <div className="challenge-buy__options-input" key={p}>
                                <input
                                    type="radio"
                                    name="platform"
                                    id={id}
                                    value={p}
                                    checked={platform === p}
                                    onChange={() => setPlatform(p)}
                                />
                                <label htmlFor={id}>{platformLabel(p)}</label>
                            </div>
                        );
                    })}
                </div>

                <div className="challenge-buy__title">Challenge</div>
                <div className="challenge-buy__options-group" id="challenge-group">
                    {challenges.map(c => {
                        const id = `challenge-${c.replace(/\s+/g, '').toLowerCase()}`;
                        return (
                            <div className="challenge-buy__options-input" key={c}>
                                <input
                                    type="radio"
                                    name="challange"
                                    id={id}
                                    value={c}
                                    checked={challenge === c}
                                    onChange={() => setChallenge(c)}
                                />
                                <label htmlFor={id}>{c}</label>
                            </div>
                        );
                    })}
                </div>

                <div className="challenge-buy__title">Capital to trade</div>
                <div className="challenge-buy__options-group" id="capital-group">
                    {capitals.map(cap => {
                        const id = `money-${cap}`;
                        return (
                            <div className="challenge-buy__options-input" key={cap}>
                                <input
                                    type="radio"
                                    name="trade"
                                    id={id}
                                    value={cap}
                                    checked={capital === cap}
                                    onChange={() => setCapital(cap)}
                                />
                                <label htmlFor={id} title={`$${cap.toLocaleString()}`}>${formatMoneyShort(cap)}</label>
                            </div>
                        );
                    })}
                </div>

                <div className="challenge-buy__table">
                    <div className="challenge-buy__table-inner">
                        <div className="challenge-buy__table-row challenge-buy__table-header">
                            <div>Challenge condition</div>
                            <div>1 Step</div>
                            <div>2 Step</div>
                            <div>XFINE Master</div>
                        </div>

                        <div className="challenge-buy__table-row">
                            <div>Max Loss per day</div>
                            <div>{fmtUsd(pick(v1, 'permittedDailyLoss'))}</div>
                            <div>{fmtUsd(pick(v2, 'permittedDailyLoss'))}</div>
                            <div>{fmtUsd(pick(vMaster, 'permittedDailyLoss'))}</div>
                        </div>

                        <div className="challenge-buy__table-row">
                            <div>Max Drawdown</div>
                            <div>{fmtUsd(pick(v1, 'permittedTotalLoss'))}</div>
                            <div>{fmtUsd(pick(v2, 'permittedTotalLoss'))}</div>
                            <div>{fmtUsd(pick(vMaster, 'permittedTotalLoss'))}</div>
                        </div>

                        <div className="challenge-buy__table-row">
                            <div>Min Trading Days</div>
                            <div>{fmtDays(pick(v1, 'profitableDays') as any)}</div>
                            <div>{fmtDays(pick(v2, 'profitableDays') as any)}</div>
                            <div>{fmtDays(pick(vMaster, 'profitableDays') as any)}</div>
                        </div>

                        <div className="challenge-buy__table-row">
                            <div>Trading period</div>
                            <div>{fmtDays(pick(v1, 'duration') as any)}</div>
                            <div>{fmtDays(pick(v2, 'duration') as any)}</div>
                            <div>{fmtDays(pick(vMaster, 'duration') as any)}</div>
                        </div>

                        <div className="challenge-buy__table-row">
                            <div>One time fee</div>
                            <div>{fmtUsd(pick(v1, 'price') as any)}</div>
                            <div>{fmtUsd(pick(v2, 'price') as any)}</div>
                            <div>{fmtUsd(pick(vMaster, 'price') as any)}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="challenge-buy__add-options">
                <div className="challenge-buy__title">Additional Options</div>

                <div className="promo-wrap">
                    <div className={`input-wrapper ${promoError ? 'invalid' : ''}`}>
                        <span className="label">Promo Code</span>
                        <div className="input promo-input">
                            <input
                                type="text"
                                id="promo-code"
                                placeholder="Enter the Code"
                                autoComplete="off"
                                value={promo}
                                onChange={(e) => { setPromo(e.target.value); setPromoError(false); setPromoHint(''); }}
                                onBlur={() => setTouched((t) => ({ ...t, promo: true }))}
                                aria-invalid={promoError}
                            />
                            <button id="promo-apply" className="code-submit button" type="button" onClick={applyPromo}>
                                Apply
                            </button>
                        </div>
                        {!!promoHint && (
                            <div className="hint" id="promo-hint" aria-live="polite">
                                {promoHint}
                            </div>
                        )}
                        {promoError && <span className="error">Invalid promo code</span>}
                    </div>
                </div>

                {[...upsalesByCondition.entries()].map(([condition, group]) => (
                    <div className="challange-buy__select-wrap" key={condition}>
                        <span className='label'>{group.label}</span>
                        <select
                            value={selectedUpsales[condition] || ''}
                            onChange={(e) =>
                                setSelectedUpsales((prev) => ({ ...prev, [condition]: e.target.value }))
                            }
                        >
                            {group.options.map((o) => (
                                <option key={o.id || 'none'} value={o.id}>
                                    {o.text}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}

                <div className='checkbox'>
                    <input type="checkbox" name="sub" id="sub" />
                    <label htmlFor="sub">Get Subscription for Trading News</label>
                </div>

                <div className='checkbox'>
                    <input type="checkbox" name="allow" id="allow" />
                    <label htmlFor="allow">Allow to Trade on Weekends</label>
                </div>

                <div className="total">
                    <span>Total Price:</span>
                    <div className="price" id="total-price">{totalPrice}</div>
                </div>
            </div>

            <div className="challenge-buy__details" role="form" aria-labelledby="acc-details-title">
                <div className="challenge-buy__title" id="acc-details-title">Account Details</div>

                <div className="input-row">
                    <div className={`input-wrapper ${showError('firstName') ? 'invalid' : ''}`}>
                        <span className="label">First Name *</span>
                        <input
                            type="text"
                            className="input"
                            id="first-name"
                            placeholder="Type First Name"
                            autoComplete="given-name"
                            required
                            value={firstName}
                            onChange={(e) => { setFirstName(e.target.value); setErrors(computeErrors()); }}
                            onBlur={() => markTouched('firstName')}
                            aria-invalid={showError('firstName')}
                        />
                        {showError('firstName') && <span className="error">{errors.firstName}</span>}
                    </div>

                    <div className={`input-wrapper ${showError('lastName') ? 'invalid' : ''}`}>
                        <span className="label">Last Name *</span>
                        <input
                            type="text"
                            className="input"
                            id="last-name"
                            placeholder="Type Last Name"
                            autoComplete="family-name"
                            required
                            value={lastName}
                            onChange={(e) => { setLastName(e.target.value); setErrors(computeErrors()); }}
                            onBlur={() => markTouched('lastName')}
                            aria-invalid={showError('lastName')}
                        />
                        {showError('lastName') && <span className="error">{errors.lastName}</span>}
                    </div>
                </div>

                <div className="input-row">
                    <div className={`input-wrapper ${showError('email') ? 'invalid' : ''}`}>
                        <span className="label">Email *</span>
                        <input
                            type="email"
                            className="input"
                            id="email"
                            placeholder="Type Email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setErrors(computeErrors()); }}
                            onBlur={() => markTouched('email')}
                            aria-invalid={showError('email')}
                        />
                        {showError('email') && <span className="error">{errors.email}</span>}
                    </div>

                    <div className={`input-wrapper ${showError('phone') ? 'invalid' : ''}`}>
                        <span className="label">Phone number *</span>
                        <input
                            type="tel"
                            className="input"
                            id="phone"
                            placeholder="+380..."
                            autoComplete="tel"
                            required
                            value={phone}
                            onChange={(e) => { setPhone(e.target.value); setErrors(computeErrors()); }}
                            onBlur={() => markTouched('phone')}
                            aria-invalid={showError('phone')}
                        />
                        {showError('phone') && <span className="error">{errors.phone}</span>}
                    </div>
                </div>

                <div className="input-row">
                    <div className={`input-wrapper ${showError('country') ? 'invalid' : ''}`}>
                        <span className="label">Country *</span>
                        <select
                            id="country"
                            required
                            value={country}
                            onChange={(e) => { setCountry(e.target.value); setErrors(computeErrors()); }}
                            onBlur={() => markTouched('country')}
                            aria-invalid={showError('country')}
                        >
                            <option value="">Select Country</option>
                            <option value="UA">Ukraine</option>
                            <option value="PL">Poland</option>
                            <option value="US">United States</option>
                            <option value="GB">United Kingdom</option>
                        </select>
                        {showError('country') && <span className="error">{errors.country}</span>}
                    </div>

                    <div className="input-wrapper">
                        <span className="label">Language</span>
                        <select
                            id="language"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                        >
                            <option value="en">English</option>
                            <option value="uk">Українська</option>
                            <option value="ru">Русский</option>
                        </select>
                    </div>
                </div>

                <div className="input-row">
                    <div className={`input-wrapper ${showError('password') ? 'invalid' : ''}`}>
                        <span className="label">Password *</span>
                        <input
                            type="password"
                            className="input"
                            id="password"
                            placeholder="Type Password"
                            autoComplete="new-password"
                            required
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setErrors(computeErrors()); }}
                            onBlur={() => markTouched('password')}
                            aria-invalid={showError('password')}
                        />
                        {showError('password') && <span className="error">{errors.password}</span>}
                    </div>

                    <div className={`input-wrapper ${showError('password2') ? 'invalid' : ''}`}>
                        <span className="label">Confirm password *</span>
                        <input
                            type="password"
                            className="input"
                            id="password2"
                            placeholder="Confirm Password"
                            autoComplete="new-password"
                            required
                            value={password2}
                            onChange={(e) => { setPassword2(e.target.value); setErrors(computeErrors()); }}
                            onBlur={() => markTouched('password2')}
                            aria-invalid={showError('password2')}
                        />
                        {showError('password2') && <span className="error">{errors.password2}</span>}
                    </div>
                </div>

                <div className="input-row">
                    <div className={`input-wrapper ${showError('paymentMethod') ? 'invalid' : ''}`}>
                        <span className="label">Select the payment method</span>
                        <select
                            id="payment-method"
                            required
                            value={paymentMethod}
                            onChange={(e) => { setPaymentMethod(e.target.value); setErrors(computeErrors()); }}
                            onBlur={() => markTouched('paymentMethod')}
                            aria-invalid={showError('paymentMethod')}
                        >
                            <option value="">Select method</option>
                            {methods.map(m => (
                                <option key={m.id} value={m.id}>{m.title}</option>
                            ))}
                        </select>
                        {showError('paymentMethod') && <span className="error">{errors.paymentMethod}</span>}
                    </div>
                    <div className="input-wrapper"></div>
                </div>

                <div className="input-row">
                    <div className={`checkbox ${showError('agree') ? 'error' : ''}`}>
                        <input
                            type="checkbox"
                            name="agree"
                            id="agree"
                            checked={agree}
                            onChange={(e) => { setAgree(e.target.checked); setErrors(computeErrors()); }}
                            onBlur={() => markTouched('agree')}
                            aria-invalid={showError('agree')}
                            required
                        />
                        <label htmlFor="agree">I agree to the Terms and Conditions</label>
                    </div>
                    {showError('agree') && <span className="error">{errors.agree}</span>}
                </div>

                <button
                    className="button checkout-button"
                    id="checkout"
                    type="button"
                    onClick={checkout}
                    disabled={!isFormValid || !current?.challengeTypeId}
                    aria-disabled={!isFormValid || !current?.challengeTypeId}
                    title={!isFormValid ? 'Fill all fields correctly to continue' : undefined}
                >
                    Proceed to Payment
                </button>
            </div>
        </div>
    );
}
