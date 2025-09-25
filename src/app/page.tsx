/* eslint-disable @next/next/no-img-element */
import FastBuy from '@/components/FastBuy';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <main className="fast-buy" id="fast-buy">
      <div className="container">
        <h1>Choose the best plan</h1>
        <div className="fast-buy__inner">
          <FastBuy />
        </div>
      </div>
    </main>
  );
}
