'use client';

import { useEffect, useMemo, useState } from 'react';

type PaymentMethod = {
    id: string;            // "198:usdt_trx"
    merchantId: number;
    slug: string;          // "yobopay" | "coinsbuy"
    currency: string | null;
    integrationId: number | null;
    title: string;         // для <option>
    imageUrl: string | null;
    openNewTab: boolean;
    external: boolean;
};

type CatalogItem = {
    id: string;
    challengeTypeId: string;
    title: string;
    platform: string;   // "MT5" | "MATCHTRADER" | ...
    challenge: string;  // "1 PHASE" | ...
    capital: number;    // 2000 | ...
    price: number | null;
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
    // ===== Server data =====
    const [platforms, setPlatforms] = useState<string[]>([]);
    const [challenges, setChallenges] = useState<string[]>([]);
    const [capitals, setCapitals] = useState<number[]>([]);
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [upsales, setUpsales] = useState<Upsale[]>([]);
    const [methods, setMethods] = useState<PaymentMethod[]>([]);

    // ===== Selections =====
    const [platform, setPlatform] = useState<string>('ALL'); // All by default
    const [challenge, setChallenge] = useState<string>('');
    const [capital, setCapital] = useState<number | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('');

    // ===== Promo =====
    const [promo, setPromo] = useState('');
    const [promoHint, setPromoHint] = useState('');
    const [promoPrice, setPromoPrice] = useState<number | null>(null); // NEW: цена после промо
    const [promoError, setPromoError] = useState<boolean>(false);      // NEW: ошибка промо

    // ===== Form fields =====
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState('');
    const [language, setLanguage] = useState('en');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [agree, setAgree] = useState(false);

    // ===== Validation state =====
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // ===== Selected Upsales =====
    const [selectedUpsales, setSelectedUpsales] = useState<Record<string, string>>({});

    // ===== Fetch data =====
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

    // ===== Resolve current variant =====
    const current = useMemo(() => {
        const candidates = catalog.filter(
            (i) =>
                (!challenge || i.challenge === challenge) &&
                (capital == null || i.capital === capital) &&
                (platform === 'ALL' || i.platform === platform)
        );
        if (candidates.length === 0) return null;
        if (platform !== 'ALL') return candidates[0];
        const prefer = ['MT5', 'MATCHTRADER'];
        for (const pf of prefer) {
            const hit = candidates.find((c) => c.platform === pf);
            if (hit) return hit;
        }
        return candidates[0];
    }, [catalog, platform, challenge, capital]);

    const currentChallengeTypeId = current?.challengeTypeId || '';

    // Сброс цены промо при смене варианта
    useEffect(() => {
        setPromoPrice(null);
        setPromoError(false);
        setPromoHint('');
    }, [currentChallengeTypeId]);

    // ===== Upsales grouped for current variant =====
    const upsalesByCondition = useMemo(() => {
        const map = new Map<string, { label: string; options: { id: string; text: string }[] }>();
        const relevant = upsales.filter(
            (u) =>
                u.challengeTypeId === currentChallengeTypeId ||
                (u.values || []).some((v) => v.challengeTypeId === currentChallengeTypeId)
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

    // ===== Price (promo-aware) =====
    const totalPrice = useMemo(() => {
        // базовая цена: если есть promoPrice -> используем его, иначе current.price, иначе capital
        let base = promoPrice ?? (typeof current?.price === 'number' ? current.price : (capital ?? 0));
        for (const upsaleId of Object.values(selectedUpsales)) {
            if (!upsaleId) continue;
            const u = upsales.find((x) => x.id === upsaleId);
            if (u && typeof u.price === 'number') base += u.price;
        }
        return `$${base}`;
    }, [promoPrice, current, capital, selectedUpsales, upsales]);

    // ===== Helpers =====
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



    // ===== Validation =====
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
        else if (!passRe.test(password))
            e.password = 'Min 8 chars, uppercase, lowercase, number and special (!@#$%^&*-)';

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

    const markTouched = (name: string) =>
        setTouched((p) => ({ ...p, [name]: true }));

    const showError = (name: string) => !!errors[name] && !!touched[name];

    // ===== Actions =====
    async function applyPromo() {
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

            // Успех: применяем новую цену
            setPromoPrice(data.price);
            setPromoHint(`Promo applied. New price: $${data.price}`);
            setPromoError(false);
        } catch (e) {
            setPromoHint('Promo check failed. Try again later');
            setPromoError(true);
            setPromoPrice(null);
        }
    }

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

        // Итоговая сумма
        let amount = promoPrice ?? (typeof current?.price === 'number' ? current.price : (capital ?? 0));
        for (const upsaleId of Object.values(selectedUpsales)) {
            if (!upsaleId) continue;
            const u = upsales.find((x) => x.id === upsaleId);
            if (u && typeof u.price === 'number') amount += u.price;
        }
        if (!amount) {
            alert('Unable to calculate amount');
            return;
        }

        const pmObj = methods.find((m) => m.id === paymentMethod);
        if (!pmObj) {
            alert('Select a payment method');
            return;
        }

        const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                selection: {
                    challengeTypeId: current.challengeTypeId,
                    promo: promo || null,
                },
                customer: {
                    firstName, lastName, email, phone, country, language,
                    password, confirmPassword: password2,
                },
                payment: {
                    merchantId: pmObj.merchantId,
                    slug: pmObj.slug,
                    currency: pmObj.currency,
                    integrationId: pmObj.integrationId,
                },
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
            {/* OPTIONS */}
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
                    {platforms.map((p) => {
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
                    {challenges.map((c) => {
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
                    {capitals.map((cap) => {
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
                                {/* короткий формат в тексте, полное значение — во всплывающей подсказке */}
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
                            <div>
                                Profit Target
                                <div className="tooltip">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2.25C14.5859 2.25 17.0661 3.27699 18.8945 5.10547C20.723 6.93395 21.75 9.41414 21.75 12C21.75 13.2804 21.4978 14.5485 21.0078 15.7314C20.5178 16.9143 19.7998 17.9892 18.8945 18.8945C17.9892 19.7998 16.9143 20.5178 15.7314 21.0078C14.6964 21.4365 13.5961 21.6833 12.4795 21.7383L12 21.75C10.7196 21.75 9.45148 21.4978 8.26855 21.0078C7.08573 20.5178 6.01078 19.7998 5.10547 18.8945C4.20016 17.9892 3.48217 16.9143 2.99219 15.7314C2.5022 14.5485 2.25 13.2804 2.25 12C2.25 9.41414 3.27699 6.93395 5.10547 5.10547C6.93395 3.27699 9.41414 2.25 12 2.25ZM12 3.75C9.81196 3.75 7.71319 4.61884 6.16602 6.16602C4.61884 7.71319 3.75 9.81196 3.75 12C3.75 13.0834 3.96333 14.1563 4.37793 15.1572C4.79253 16.1581 5.39995 17.0679 6.16602 17.834C6.93209 18.6001 7.84186 19.2075 8.84277 19.6221C9.84371 20.0367 10.9166 20.25 12 20.25L12.4053 20.2402C13.3502 20.1938 14.2813 19.9849 15.1572 19.6221C16.1581 19.2075 17.0679 18.6001 17.834 17.834C18.6001 17.0679 19.2075 16.1581 19.6221 15.1572C20.0367 14.1563 20.25 13.0834 20.25 12C20.25 9.81196 19.3812 7.71319 17.834 6.16602C16.2868 4.61884 14.188 3.75 12 3.75ZM12.0771 11.2539C12.4551 11.2925 12.75 11.6118 12.75 12V15.25H13C13.4142 15.25 13.75 15.5858 13.75 16C13.75 16.4142 13.4142 16.75 13 16.75H12C11.586 16.7498 11.25 16.4141 11.25 16V12.75H11C10.586 12.7498 10.25 12.4141 10.25 12C10.25 11.5859 10.586 11.2502 11 11.25H12L12.0771 11.2539ZM12.0098 8.25C12.424 8.25 12.7598 8.58579 12.7598 9C12.7598 9.41421 12.424 9.75 12.0098 9.75H12C11.5858 9.75 11.25 9.41421 11.25 9C11.25 8.58579 11.5858 8.25 12 8.25H12.0098Z" fill="#B5B5B5"></path>
                                    </svg>

                                    <div className="tooltip-content">
                                        In order to pass your Funded Challenge you need to hit the
                                        specified profit targets.
                                    </div>
                                </div>
                            </div>
                            <div>200$ / 10%</div>
                            <div>120$ / 6%</div>
                            <div>-</div>
                        </div>
                        <div className="challenge-buy__table-row">
                            <div>
                                Profit Target
                                <div className="tooltip">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2.25C14.5859 2.25 17.0661 3.27699 18.8945 5.10547C20.723 6.93395 21.75 9.41414 21.75 12C21.75 13.2804 21.4978 14.5485 21.0078 15.7314C20.5178 16.9143 19.7998 17.9892 18.8945 18.8945C17.9892 19.7998 16.9143 20.5178 15.7314 21.0078C14.6964 21.4365 13.5961 21.6833 12.4795 21.7383L12 21.75C10.7196 21.75 9.45148 21.4978 8.26855 21.0078C7.08573 20.5178 6.01078 19.7998 5.10547 18.8945C4.20016 17.9892 3.48217 16.9143 2.99219 15.7314C2.5022 14.5485 2.25 13.2804 2.25 12C2.25 9.41414 3.27699 6.93395 5.10547 5.10547C6.93395 3.27699 9.41414 2.25 12 2.25ZM12 3.75C9.81196 3.75 7.71319 4.61884 6.16602 6.16602C4.61884 7.71319 3.75 9.81196 3.75 12C3.75 13.0834 3.96333 14.1563 4.37793 15.1572C4.79253 16.1581 5.39995 17.0679 6.16602 17.834C6.93209 18.6001 7.84186 19.2075 8.84277 19.6221C9.84371 20.0367 10.9166 20.25 12 20.25L12.4053 20.2402C13.3502 20.1938 14.2813 19.9849 15.1572 19.6221C16.1581 19.2075 17.0679 18.6001 17.834 17.834C18.6001 17.0679 19.2075 16.1581 19.6221 15.1572C20.0367 14.1563 20.25 13.0834 20.25 12C20.25 9.81196 19.3812 7.71319 17.834 6.16602C16.2868 4.61884 14.188 3.75 12 3.75ZM12.0771 11.2539C12.4551 11.2925 12.75 11.6118 12.75 12V15.25H13C13.4142 15.25 13.75 15.5858 13.75 16C13.75 16.4142 13.4142 16.75 13 16.75H12C11.586 16.7498 11.25 16.4141 11.25 16V12.75H11C10.586 12.7498 10.25 12.4141 10.25 12C10.25 11.5859 10.586 11.2502 11 11.25H12L12.0771 11.2539ZM12.0098 8.25C12.424 8.25 12.7598 8.58579 12.7598 9C12.7598 9.41421 12.424 9.75 12.0098 9.75H12C11.5858 9.75 11.25 9.41421 11.25 9C11.25 8.58579 11.5858 8.25 12 8.25H12.0098Z" fill="#B5B5B5"></path>
                                    </svg>

                                    <div className="tooltip-content">
                                        In order to pass your Funded Challenge you need to hit the
                                        specified profit targets.
                                    </div>
                                </div>
                            </div>
                            <div>200$ / 10%</div>
                            <div>120$ / 6%</div>
                            <div>-</div>
                        </div>
                        <div className="challenge-buy__table-row">
                            <div>
                                Profit Target
                                <div className="tooltip">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2.25C14.5859 2.25 17.0661 3.27699 18.8945 5.10547C20.723 6.93395 21.75 9.41414 21.75 12C21.75 13.2804 21.4978 14.5485 21.0078 15.7314C20.5178 16.9143 19.7998 17.9892 18.8945 18.8945C17.9892 19.7998 16.9143 20.5178 15.7314 21.0078C14.6964 21.4365 13.5961 21.6833 12.4795 21.7383L12 21.75C10.7196 21.75 9.45148 21.4978 8.26855 21.0078C7.08573 20.5178 6.01078 19.7998 5.10547 18.8945C4.20016 17.9892 3.48217 16.9143 2.99219 15.7314C2.5022 14.5485 2.25 13.2804 2.25 12C2.25 9.41414 3.27699 6.93395 5.10547 5.10547C6.93395 3.27699 9.41414 2.25 12 2.25ZM12 3.75C9.81196 3.75 7.71319 4.61884 6.16602 6.16602C4.61884 7.71319 3.75 9.81196 3.75 12C3.75 13.0834 3.96333 14.1563 4.37793 15.1572C4.79253 16.1581 5.39995 17.0679 6.16602 17.834C6.93209 18.6001 7.84186 19.2075 8.84277 19.6221C9.84371 20.0367 10.9166 20.25 12 20.25L12.4053 20.2402C13.3502 20.1938 14.2813 19.9849 15.1572 19.6221C16.1581 19.2075 17.0679 18.6001 17.834 17.834C18.6001 17.0679 19.2075 16.1581 19.6221 15.1572C20.0367 14.1563 20.25 13.0834 20.25 12C20.25 9.81196 19.3812 7.71319 17.834 6.16602C16.2868 4.61884 14.188 3.75 12 3.75ZM12.0771 11.2539C12.4551 11.2925 12.75 11.6118 12.75 12V15.25H13C13.4142 15.25 13.75 15.5858 13.75 16C13.75 16.4142 13.4142 16.75 13 16.75H12C11.586 16.7498 11.25 16.4141 11.25 16V12.75H11C10.586 12.7498 10.25 12.4141 10.25 12C10.25 11.5859 10.586 11.2502 11 11.25H12L12.0771 11.2539ZM12.0098 8.25C12.424 8.25 12.7598 8.58579 12.7598 9C12.7598 9.41421 12.424 9.75 12.0098 9.75H12C11.5858 9.75 11.25 9.41421 11.25 9C11.25 8.58579 11.5858 8.25 12 8.25H12.0098Z" fill="#B5B5B5"></path>
                                    </svg>

                                    <div className="tooltip-content">
                                        In order to pass your Funded Challenge you need to hit the
                                        specified profit targets.
                                    </div>
                                </div>
                            </div>
                            <div>200$ / 10%</div>
                            <div>120$ / 6%</div>
                            <div>-</div>
                        </div>
                        <div className="challenge-buy__table-row">
                            <div>
                                Profit Target
                                <div className="tooltip">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2.25C14.5859 2.25 17.0661 3.27699 18.8945 5.10547C20.723 6.93395 21.75 9.41414 21.75 12C21.75 13.2804 21.4978 14.5485 21.0078 15.7314C20.5178 16.9143 19.7998 17.9892 18.8945 18.8945C17.9892 19.7998 16.9143 20.5178 15.7314 21.0078C14.6964 21.4365 13.5961 21.6833 12.4795 21.7383L12 21.75C10.7196 21.75 9.45148 21.4978 8.26855 21.0078C7.08573 20.5178 6.01078 19.7998 5.10547 18.8945C4.20016 17.9892 3.48217 16.9143 2.99219 15.7314C2.5022 14.5485 2.25 13.2804 2.25 12C2.25 9.41414 3.27699 6.93395 5.10547 5.10547C6.93395 3.27699 9.41414 2.25 12 2.25ZM12 3.75C9.81196 3.75 7.71319 4.61884 6.16602 6.16602C4.61884 7.71319 3.75 9.81196 3.75 12C3.75 13.0834 3.96333 14.1563 4.37793 15.1572C4.79253 16.1581 5.39995 17.0679 6.16602 17.834C6.93209 18.6001 7.84186 19.2075 8.84277 19.6221C9.84371 20.0367 10.9166 20.25 12 20.25L12.4053 20.2402C13.3502 20.1938 14.2813 19.9849 15.1572 19.6221C16.1581 19.2075 17.0679 18.6001 17.834 17.834C18.6001 17.0679 19.2075 16.1581 19.6221 15.1572C20.0367 14.1563 20.25 13.0834 20.25 12C20.25 9.81196 19.3812 7.71319 17.834 6.16602C16.2868 4.61884 14.188 3.75 12 3.75ZM12.0771 11.2539C12.4551 11.2925 12.75 11.6118 12.75 12V15.25H13C13.4142 15.25 13.75 15.5858 13.75 16C13.75 16.4142 13.4142 16.75 13 16.75H12C11.586 16.7498 11.25 16.4141 11.25 16V12.75H11C10.586 12.7498 10.25 12.4141 10.25 12C10.25 11.5859 10.586 11.2502 11 11.25H12L12.0771 11.2539ZM12.0098 8.25C12.424 8.25 12.7598 8.58579 12.7598 9C12.7598 9.41421 12.424 9.75 12.0098 9.75H12C11.5858 9.75 11.25 9.41421 11.25 9C11.25 8.58579 11.5858 8.25 12 8.25H12.0098Z" fill="#B5B5B5"></path>
                                    </svg>

                                    <div className="tooltip-content">
                                        In order to pass your Funded Challenge you need to hit the
                                        specified profit targets.
                                    </div>
                                </div>
                            </div>
                            <div>200$ / 10%</div>
                            <div>120$ / 6%</div>
                            <div>-</div>
                        </div>
                        <div className="challenge-buy__table-row">
                            <div>
                                Profit Target
                                <div className="tooltip">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2.25C14.5859 2.25 17.0661 3.27699 18.8945 5.10547C20.723 6.93395 21.75 9.41414 21.75 12C21.75 13.2804 21.4978 14.5485 21.0078 15.7314C20.5178 16.9143 19.7998 17.9892 18.8945 18.8945C17.9892 19.7998 16.9143 20.5178 15.7314 21.0078C14.6964 21.4365 13.5961 21.6833 12.4795 21.7383L12 21.75C10.7196 21.75 9.45148 21.4978 8.26855 21.0078C7.08573 20.5178 6.01078 19.7998 5.10547 18.8945C4.20016 17.9892 3.48217 16.9143 2.99219 15.7314C2.5022 14.5485 2.25 13.2804 2.25 12C2.25 9.41414 3.27699 6.93395 5.10547 5.10547C6.93395 3.27699 9.41414 2.25 12 2.25ZM12 3.75C9.81196 3.75 7.71319 4.61884 6.16602 6.16602C4.61884 7.71319 3.75 9.81196 3.75 12C3.75 13.0834 3.96333 14.1563 4.37793 15.1572C4.79253 16.1581 5.39995 17.0679 6.16602 17.834C6.93209 18.6001 7.84186 19.2075 8.84277 19.6221C9.84371 20.0367 10.9166 20.25 12 20.25L12.4053 20.2402C13.3502 20.1938 14.2813 19.9849 15.1572 19.6221C16.1581 19.2075 17.0679 18.6001 17.834 17.834C18.6001 17.0679 19.2075 16.1581 19.6221 15.1572C20.0367 14.1563 20.25 13.0834 20.25 12C20.25 9.81196 19.3812 7.71319 17.834 6.16602C16.2868 4.61884 14.188 3.75 12 3.75ZM12.0771 11.2539C12.4551 11.2925 12.75 11.6118 12.75 12V15.25H13C13.4142 15.25 13.75 15.5858 13.75 16C13.75 16.4142 13.4142 16.75 13 16.75H12C11.586 16.7498 11.25 16.4141 11.25 16V12.75H11C10.586 12.7498 10.25 12.4141 10.25 12C10.25 11.5859 10.586 11.2502 11 11.25H12L12.0771 11.2539ZM12.0098 8.25C12.424 8.25 12.7598 8.58579 12.7598 9C12.7598 9.41421 12.424 9.75 12.0098 9.75H12C11.5858 9.75 11.25 9.41421 11.25 9C11.25 8.58579 11.5858 8.25 12 8.25H12.0098Z" fill="#B5B5B5"></path>
                                    </svg>

                                    <div className="tooltip-content">
                                        In order to pass your Funded Challenge you need to hit the
                                        specified profit targets.
                                    </div>
                                </div>
                            </div>
                            <div>200$ / 10%</div>
                            <div>120$ / 6%</div>
                            <div>-</div>
                        </div>
                    </div>
                </div>

            </div>

            {/* ADDITIONAL OPTIONS (Upsales + Promo) */}
            <div className="challenge-buy__add-options">
                <div className="challenge-buy__title">Additional Options</div>

                <div className={`input-wrapper ${promoError ? 'error' : ''}`}>
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
                    <input
                        type="checkbox"
                        name="sub"
                        id="sub"
                    />
                    <label htmlFor="sub">Get Subscription for Trading News</label>
                </div>

                <div className='checkbox'>
                    <input
                        type="checkbox"
                        name="allow"
                        id="allow"
                    />
                    <label htmlFor="allow">Allow to Trade on Weekends</label>
                </div>


                <div className="total">
                    <span>Total Price:</span>
                    <div className="price" id="total-price">{totalPrice}</div>
                </div>
            </div>

            {/* DETAILS */}
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
                            {methods.map((m) => (
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
