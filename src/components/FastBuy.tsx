'use client';

import { useEffect, useMemo, useState } from 'react';

/* ===== Types ===== */
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

/* ===== Banner config ===== */
const BANNERS: Record<string, { cls: string; img: string; title: string; text: string }> = {
    '1 PHASE': {
        cls: 'plan-banner--stealth',
        img: 'https://propxfine.com/wp-content/uploads/2025/08/mid.svg',
        title: 'Stealth',
        text: 'Seien Sie schneller als der Markt',
    },
    '2 PHASE': {
        cls: 'plan-banner--basic',
        img: 'https://propxfine.com/wp-content/uploads/2025/08/slow.svg',
        title: 'Basic',
        text: 'Move towards yours goals without haste',
    },
    'XFINE MASTER': {
        cls: 'plan-banner--cosmo',
        img: 'https://propxfine.com/wp-content/uploads/2025/08/fast.svg',
        title: 'Cosmo',
        text: 'Get ahead of the action with cosmic speed',
    },
};

function getBannerInfo(challenge: string | undefined) {
    if (!challenge) return BANNERS['1 PHASE'];
    const key = /(MASTER|PHASE\s*3|3\s*PHASE)/i.test(challenge)
        ? 'XFINE MASTER'
        : /2/.test(challenge)
            ? '2 PHASE'
            : '1 PHASE';
    return BANNERS[key];
}

/* ===== Helpers ===== */
function shortK(n?: number | null) {
    if (!n || !isFinite(n)) return '—';
    if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}m`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return `${Math.round(n)}`;
}

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

/* ===== Country & Language lists ===== */
const COUNTRIES: Array<{ code: string; name: string }> = [
    { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' }, { code: 'DZ', name: 'Algeria' },
    { code: 'AD', name: 'Andorra' }, { code: 'AO', name: 'Angola' }, { code: 'AG', name: 'Antigua and Barbuda' },
    { code: 'AR', name: 'Argentina' }, { code: 'AM', name: 'Armenia' }, { code: 'AU', name: 'Australia' },
    { code: 'AT', name: 'Austria' }, { code: 'AZ', name: 'Azerbaijan' }, { code: 'BS', name: 'Bahamas' },
    { code: 'BH', name: 'Bahrain' }, { code: 'BD', name: 'Bangladesh' }, { code: 'BB', name: 'Barbados' },
    { code: 'BY', name: 'Belarus' }, { code: 'BE', name: 'Belgium' }, { code: 'BZ', name: 'Belize' },
    { code: 'BJ', name: 'Benin' }, { code: 'BT', name: 'Bhutan' }, { code: 'BO', name: 'Bolivia' },
    { code: 'BA', name: 'Bosnia and Herzegovina' }, { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brazil' },
    { code: 'BN', name: 'Brunei' }, { code: 'BG', name: 'Bulgaria' }, { code: 'BF', name: 'Burkina Faso' },
    { code: 'BI', name: 'Burundi' }, { code: 'KH', name: 'Cambodia' }, { code: 'CM', name: 'Cameroon' },
    { code: 'CA', name: 'Canada' }, { code: 'CV', name: 'Cape Verde' }, { code: 'CF', name: 'Central African Republic' },
    { code: 'TD', name: 'Chad' }, { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' },
    { code: 'CO', name: 'Colombia' }, { code: 'KM', name: 'Comoros' }, { code: 'CG', name: 'Congo' },
    { code: 'CD', name: 'Congo, Democratic Republic' }, { code: 'CR', name: 'Costa Rica' },
    { code: 'CI', name: "Côte d'Ivoire" }, { code: 'HR', name: 'Croatia' }, { code: 'CU', name: 'Cuba' },
    { code: 'CY', name: 'Cyprus' }, { code: 'CZ', name: 'Czechia' }, { code: 'DK', name: 'Denmark' },
    { code: 'DJ', name: 'Djibouti' }, { code: 'DM', name: 'Dominica' }, { code: 'DO', name: 'Dominican Republic' },
    { code: 'EC', name: 'Ecuador' }, { code: 'EG', name: 'Egypt' }, { code: 'SV', name: 'El Salvador' },
    { code: 'GQ', name: 'Equatorial Guinea' }, { code: 'ER', name: 'Eritrea' }, { code: 'EE', name: 'Estonia' },
    { code: 'SZ', name: 'Eswatini' }, { code: 'ET', name: 'Ethiopia' }, { code: 'FJ', name: 'Fiji' },
    { code: 'FI', name: 'Finland' }, { code: 'FR', name: 'France' }, { code: 'GA', name: 'Gabon' },
    { code: 'GM', name: 'Gambia' }, { code: 'GE', name: 'Georgia' }, { code: 'DE', name: 'Germany' },
    { code: 'GH', name: 'Ghana' }, { code: 'GR', name: 'Greece' }, { code: 'GD', name: 'Grenada' },
    { code: 'GT', name: 'Guatemala' }, { code: 'GN', name: 'Guinea' }, { code: 'GW', name: 'Guinea-Bissau' },
    { code: 'GY', name: 'Guyana' }, { code: 'HT', name: 'Haiti' }, { code: 'HN', name: 'Honduras' },
    { code: 'HU', name: 'Hungary' }, { code: 'IS', name: 'Iceland' }, { code: 'IN', name: 'India' },
    { code: 'ID', name: 'Indonesia' }, { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Iraq' },
    { code: 'IE', name: 'Ireland' }, { code: 'IL', name: 'Israel' }, { code: 'IT', name: 'Italy' },
    { code: 'JM', name: 'Jamaica' }, { code: 'JP', name: 'Japan' }, { code: 'JO', name: 'Jordan' },
    { code: 'KZ', name: 'Kazakhstan' }, { code: 'KE', name: 'Kenya' }, { code: 'KI', name: 'Kiribati' },
    { code: 'KR', name: 'Korea, Republic of' }, { code: 'KW', name: 'Kuwait' }, { code: 'KG', name: 'Kyrgyzstan' },
    { code: 'LA', name: 'Lao PDR' }, { code: 'LV', name: 'Latvia' }, { code: 'LB', name: 'Lebanon' },
    { code: 'LS', name: 'Lesotho' }, { code: 'LR', name: 'Liberia' }, { code: 'LY', name: 'Libya' },
    { code: 'LI', name: 'Liechtenstein' }, { code: 'LT', name: 'Lithuania' }, { code: 'LU', name: 'Luxembourg' },
    { code: 'MG', name: 'Madagascar' }, { code: 'MW', name: 'Malawi' }, { code: 'MY', name: 'Malaysia' },
    { code: 'MV', name: 'Maldives' }, { code: 'ML', name: 'Mali' }, { code: 'MT', name: 'Malta' },
    { code: 'MH', name: 'Marshall Islands' }, { code: 'MR', name: 'Mauritania' }, { code: 'MU', name: 'Mauritius' },
    { code: 'MX', name: 'Mexico' }, { code: 'FM', name: 'Micronesia' }, { code: 'MD', name: 'Moldova' },
    { code: 'MC', name: 'Monaco' }, { code: 'MN', name: 'Mongolia' }, { code: 'ME', name: 'Montenegro' },
    { code: 'MA', name: 'Morocco' }, { code: 'MZ', name: 'Mozambique' }, { code: 'MM', name: 'Myanmar' },
    { code: 'NA', name: 'Namibia' }, { code: 'NR', name: 'Nauru' }, { code: 'NP', name: 'Nepal' },
    { code: 'NL', name: 'Netherlands' }, { code: 'NZ', name: 'New Zealand' }, { code: 'NI', name: 'Nicaragua' },
    { code: 'NE', name: 'Niger' }, { code: 'NG', name: 'Nigeria' }, { code: 'MK', name: 'North Macedonia' },
    { code: 'NO', name: 'Norway' }, { code: 'OM', name: 'Oman' }, { code: 'PK', name: 'Pakistan' },
    { code: 'PW', name: 'Palau' }, { code: 'PA', name: 'Panama' }, { code: 'PG', name: 'Papua New Guinea' },
    { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Peru' }, { code: 'PH', name: 'Philippines' },
    { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' }, { code: 'QA', name: 'Qatar' },
    { code: 'RO', name: 'Romania' }, { code: 'RU', name: 'Russia' }, { code: 'RW', name: 'Rwanda' },
    { code: 'KN', name: 'Saint Kitts and Nevis' }, { code: 'LC', name: 'Saint Lucia' }, { code: 'VC', name: 'Saint Vincent and the Grenadines' },
    { code: 'WS', name: 'Samoa' }, { code: 'SM', name: 'San Marino' }, { code: 'ST', name: 'Sao Tome and Principe' },
    { code: 'SA', name: 'Saudi Arabia' }, { code: 'SN', name: 'Senegal' }, { code: 'RS', name: 'Serbia' },
    { code: 'SC', name: 'Seychelles' }, { code: 'SL', name: 'Sierra Leone' }, { code: 'SG', name: 'Singapore' },
    { code: 'SK', name: 'Slovakia' }, { code: 'SI', name: 'Slovenia' }, { code: 'SB', name: 'Solomon Islands' },
    { code: 'SO', name: 'Somalia' }, { code: 'ZA', name: 'South Africa' }, { code: 'ES', name: 'Spain' },
    { code: 'LK', name: 'Sri Lanka' }, { code: 'SD', name: 'Sudan' }, { code: 'SR', name: 'Suriname' },
    { code: 'SE', name: 'Sweden' }, { code: 'CH', name: 'Switzerland' }, { code: 'SY', name: 'Syria' },
    { code: 'TW', name: 'Taiwan' }, { code: 'TJ', name: 'Tajikistan' }, { code: 'TZ', name: 'Tanzania' },
    { code: 'TH', name: 'Thailand' }, { code: 'TL', name: 'Timor-Leste' }, { code: 'TG', name: 'Togo' },
    { code: 'TO', name: 'Tonga' }, { code: 'TT', name: 'Trinidad and Tobago' }, { code: 'TN', name: 'Tunisia' },
    { code: 'TR', name: 'Türkiye' }, { code: 'TM', name: 'Turkmenistan' }, { code: 'TV', name: 'Tuvalu' },
    { code: 'UG', name: 'Uganda' }, { code: 'UA', name: 'Ukraine' }, { code: 'AE', name: 'United Arab Emirates' },
    { code: 'GB', name: 'United Kingdom' }, { code: 'US', name: 'United States' }, { code: 'UY', name: 'Uruguay' },
    { code: 'UZ', name: 'Uzbekistan' }, { code: 'VU', name: 'Vanuatu' }, { code: 'VE', name: 'Venezuela' },
    { code: 'VN', name: 'Viet Nam' }, { code: 'YE', name: 'Yemen' }, { code: 'ZM', name: 'Zambia' }, { code: 'ZW', name: 'Zimbabwe' },
];

const LANGS: Array<{ code: string; name: string }> = [
    { code: 'en', name: 'English' }, { code: 'de', name: 'Deutsch' }, { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' }, { code: 'pt', name: 'Português' }, { code: 'it', name: 'Italiano' },
    { code: 'pl', name: 'Polski' }, { code: 'uk', name: 'Українська' }, { code: 'ru', name: 'Русский' },
    { code: 'kk', name: 'Қазақ' }, { code: 'tr', name: 'Türkçe' }, { code: 'zh', name: '中文' },
    { code: 'ar', name: 'العربية' },
];

/* ===== Component ===== */
export default function FastBuy() {
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
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const sp = new URLSearchParams(window.location.search);
        const qpPromo = sp.get('promo');
        const qpPlatform = sp.get('platform');
        const qpChallenge = sp.get('challenge');
        const qpCapital = sp.get('capital');

        if (qpPromo) setPromo(qpPromo);

        if (qpPlatform && platforms.includes(qpPlatform)) setPlatform(qpPlatform);
        if (qpChallenge && challenges.includes(qpChallenge)) setChallenge(qpChallenge);

        if (qpCapital) {
            const cNum = Number(qpCapital);
            if (!Number.isNaN(cNum) && capitals.includes(cNum)) setCapital(cNum);
        }
    }, [platforms, challenges, capitals]);

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

    useEffect(() => {
        setPromoPrice(null);
        setPromoError(false);
        setPromoHint('');
    }, [currentChallengeTypeId]);

    // helper: формат "+$22" или "+$13.2"
    function fmtPlusUsd(n?: number | null) {
        if (n == null || !isFinite(n)) return '';
        const s = Number.isInteger(n) ? String(n) : n.toFixed(1);
        return ` (+$${s})`;
    }

    const upsalesByCondition = useMemo(() => {
        const groups = new Map<string, { label: string; options: { id: string; text: string }[] }>();

        // релевантные апсейлы под текущий challengeTypeId
        const relevant = upsales.filter(
            (u) =>
                u.challengeTypeId === currentChallengeTypeId ||
                (u.values || []).some((v) => v.challengeTypeId === currentChallengeTypeId)
        );

        const seen = new Set<string>(); // чтобы не пускать дубли

        for (const u of relevant) {
            const label = UPSALE_LABEL[u.condition] || u.condition;

            const vMatch = (u.values || []).find((v) => v.challengeTypeId === currentChallengeTypeId);
            const valuePart =
                vMatch && vMatch.value !== undefined && vMatch.value !== null && vMatch.value !== ''
                    ? ` = ${vMatch.value}`
                    : '';

            const baseTitle = (u.title || label).trim();
            const priceNum = typeof u.price === 'number' ? u.price : null;

            const text = `${baseTitle}${valuePart}${fmtPlusUsd(priceNum)}`;

            const dedupeKey = [
                u.condition,
                baseTitle.toLowerCase(),
                String(vMatch?.value ?? ''),
                priceNum ?? ''
            ].join('|');

            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);

            if (!groups.has(u.condition)) {
                groups.set(u.condition, { label, options: [] });
            }
            groups.get(u.condition)!.options.push({ id: u.id, text });
        }

        for (const g of groups.values()) {
            g.options.sort((a, b) => a.text.localeCompare(b.text));
            g.options.unshift({ id: '', text: 'Select' });
        }

        return groups;
    }, [upsales, currentChallengeTypeId]);


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
    }, [firstName, lastName, email, phone, country, password, password2, paymentMethod, agree]);

    const markTouched = (name: string) => setTouched((p) => ({ ...p, [name]: true }));
    const showError = (name: string) => !!errors[name] && !!touched[name];

    const basePlatform = useMemo(
        () => (platform === 'ALL' ? current?.platform : platform),
        [platform, current?.platform]
    );

    const v1 = useMemo(
        () =>
            catalog.find(
                (v) =>
                    v.platform === basePlatform &&
                    v.capital === capital &&
                    (v.challenge?.toUpperCase().includes('1') || v.challenge?.toUpperCase().includes('ONE'))
            ),
        [catalog, basePlatform, capital]
    );

    const v2 = useMemo(
        () =>
            catalog.find(
                (v) => v.platform === basePlatform && v.capital === capital && v.challenge?.toUpperCase().includes('2')
            ),
        [catalog, basePlatform, capital]
    );

    const vMaster = useMemo(
        () =>
            catalog.find(
                (v) =>
                    v.platform === basePlatform &&
                    v.capital === capital &&
                    /(MASTER|MASTERS?|XFINE\s*MASTER|PHASE\s*3|3\s*PHASE)/i.test(v.challenge || '')
            ),
        [catalog, basePlatform, capital]
    );

    function pick<K extends keyof CatalogItem>(item: CatalogItem | null | undefined, key: K) {
        return item ? item[key] : null;
    }

    const totalPrice = useMemo(() => {
        let base = promoPrice ?? (typeof current?.price === 'number' ? current.price : (capital ?? 0));
        for (const upsaleId of Object.values(selectedUpsales)) {
            if (!upsaleId) continue;
            const u = upsales.find((x) => x.id === upsaleId);
            if (u && typeof u.price === 'number') base += u.price;
        }
        return `$${Math.round(base)}`;
    }, [promoPrice, current, capital, selectedUpsales, upsales]);

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
            setPromoPrice(data.price);
            setPromoHint(`Promo applied. New price: $${data.price}`);
            setPromoError(false);
        } catch {
            setPromoHint('Promo check failed. Try again later');
            setPromoError(true);
            setPromoPrice(null);
        }
    }

    async function checkout() {
        if (!isFormValid) {
            setTouched({
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                country: true,
                password: true,
                password2: true,
                paymentMethod: true,
                agree: true,
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
                    firstName,
                    lastName,
                    email,
                    phone,
                    country,
                    language,
                    password,
                    confirmPassword: password2,
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

    const banner = getBannerInfo(challenge);
    const bannerPrice = capital ? `$${shortK(capital)}` : '—';

    const availableCapitalsSet = useMemo(() => {
        const set = new Set<number>();
        const rows = catalog.filter(
            (v) =>
                (platform === 'ALL' ? v.platform === current?.platform : v.platform === platform) &&
                (!challenge || v.challenge === challenge)
        );
        for (const r of rows) {
            const hasData =
                r.permittedDailyLoss != null ||
                r.permittedTotalLoss != null ||
                r.profitableDays != null ||
                r.duration != null ||
                typeof r.price === 'number';
            if (hasData) set.add(r.capital);
        }
        return set;
    }, [catalog, platform, challenge, current?.platform]);

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
                        const disabled = !availableCapitalsSet.has(cap);
                        return (
                            <div className={`challenge-buy__options-input ${disabled ? 'is-inactive' : ''}`} key={cap}>
                                <input
                                    type="radio"
                                    name="trade"
                                    id={id}
                                    value={cap}
                                    checked={capital === cap}
                                    onChange={() => !disabled && setCapital(cap)}
                                    disabled={disabled}
                                />
                                <label htmlFor={id} title={`$${cap.toLocaleString()}`}>
                                    ${formatMoneyShort(cap)}
                                </label>
                            </div>
                        );
                    })}
                </div>

                <div className={`plan-banner ${banner.cls}`}>
                    <img src={banner.img} alt="" />
                    <div>
                        <div className="secondary-text-alt">{banner.title}</div>
                        <div className="body-text">{banner.text}</div>
                    </div>
                    <div className="heading-4">{bannerPrice}</div>
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
                                Max Loss per day
                                <div className="tooltip" aria-hidden="true">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2.25C14.5859 2.25 17.0661 3.27699 18.8945 5.10547C20.723 6.93395 21.75 9.41414 21.75 12C21.75 13.2804 21.4978 14.5485 21.0078 15.7314C20.5178 16.9143 19.7998 17.9892 18.8945 18.8945C17.9892 19.7998 16.9143 20.5178 15.7314 21.0078C14.6964 21.4365 13.5961 21.6833 12.4795 21.7383L12 21.75C10.7196 21.75 9.45148 21.4978 8.26855 21.0078C7.08573 20.5178 6.01078 19.7998 5.10547 18.8945C4.20016 17.9892 3.48217 16.9143 2.99219 15.7314C2.5022 14.5485 2.25 13.2804 2.25 12C2.25 9.41414 3.27699 6.93395 5.10547 5.10547C6.93395 3.27699 9.41414 2.25 12 2.25Z" fill="#B5B5B5"></path>
                                    </svg>
                                    <div className="tooltip-content">Permitted Daily Loss</div>
                                </div>
                            </div>
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
                                onChange={(e) => {
                                    setPromo(e.target.value);
                                    setPromoError(false);
                                    setPromoHint('');
                                }}
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
                        <span className="label">{group.label}</span>
                        <select
                            value={selectedUpsales[condition] || ''}
                            onChange={(e) => setSelectedUpsales((prev) => ({ ...prev, [condition]: e.target.value }))}
                        >
                            {group.options.map((o) => (
                                <option key={o.id || 'none'} value={o.id}>
                                    {o.text}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}

                <div className="checkbox">
                    <input type="checkbox" name="sub" id="sub" />
                    <label htmlFor="sub">Get Subscription for Trading News</label>
                </div>

                <div className="checkbox">
                    <input type="checkbox" name="allow" id="allow" />
                    <label htmlFor="allow">Allow to Trade on Weekends</label>
                </div>

                <div className="total">
                    <span>Total Price:</span>
                    <div className="price" id="total-price">
                        {totalPrice}
                    </div>
                </div>
            </div>

            <div className="challenge-buy__details" role="form" aria-labelledby="acc-details-title">
                <div className="challenge-buy__title" id="acc-details-title">
                    Account Details
                </div>

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
                            onChange={(e) => {
                                setFirstName(e.target.value);
                                setErrors(computeErrors());
                            }}
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
                            onChange={(e) => {
                                setLastName(e.target.value);
                                setErrors(computeErrors());
                            }}
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
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setErrors(computeErrors());
                            }}
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
                            onChange={(e) => {
                                setPhone(e.target.value);
                                setErrors(computeErrors());
                            }}
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
                            onChange={(e) => {
                                setCountry(e.target.value);
                                setErrors(computeErrors());
                            }}
                            onBlur={() => markTouched('country')}
                            aria-invalid={showError('country')}
                        >
                            <option value="">Select Country</option>
                            {COUNTRIES.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        {showError('country') && <span className="error">{errors.country}</span>}
                    </div>

                    <div className="input-wrapper">
                        <span className="label">Language</span>
                        <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)}>
                            {LANGS.map((l) => (
                                <option key={l.code} value={l.code}>
                                    {l.name}
                                </option>
                            ))}
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
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setErrors(computeErrors());
                            }}
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
                            onChange={(e) => {
                                setPassword2(e.target.value);
                                setErrors(computeErrors());
                            }}
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
                            onChange={(e) => {
                                setPaymentMethod(e.target.value);
                                setErrors(computeErrors());
                            }}
                            onBlur={() => markTouched('paymentMethod')}
                            aria-invalid={showError('paymentMethod')}
                        >
                            <option value="">Select method</option>
                            {methods.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.title}
                                </option>
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
                            onChange={(e) => {
                                setAgree(e.target.checked);
                                setErrors(computeErrors());
                            }}
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
