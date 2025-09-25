// убрать dynamic и оставить обычный импорт
import FastBuy from '@/components/FastBuy';

export const dynamic = 'force-dynamic';

export default function FastBuyPage() {
    return (
        <main className="fast-buy" id="fast-buy">
            <div className="container">
                <div className="fast-buy__inner">
                    <FastBuy />
                </div>
            </div>
        </main>
    );
}
