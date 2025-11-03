/* eslint-disable @next/next/no-img-element */
import FastBuy from '@/components/FastBuy';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <main className="fast-buy" id="fast-buy">
      <header className="header">
        <div className="container">
          <div className="header__inner">
            <a className="logo">
              <img
                src="https://propxfine.com/wp-content/themes/xfine_1734700332/prop-landing/assets/img/logo.svg"
                alt="XFINE"
              />
            </a>
          </div>
        </div>
      </header>

      <div className="container">
        <h1>Choose the best plan</h1>
        <div className="fast-buy__inner">
          <FastBuy />
        </div>
      </div>

      <footer className="footer">
        <div className="container">
          <div className="footer__inner">
            <div className="footer__main">
              <div className="footer__col-main">
                <img
                  src="https://propxfine.com/wp-content/themes/xfine_1734700332/prop-landing/assets/img/logo.svg"
                  alt="XFINE"
                />
                <div className="secondary-text text-white">
                  @2025 XFINE. Alle Rechte vorbehalten.
                </div>

                <a href="mailto:support@x-fine.live" className="body-text footer-email">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path
                      d="M4.616 19C4.15533 19 3.771 18.846 3.463 18.538C3.155 18.23 3.00067 17.8453 3 17.384V6.616C3 6.15533 3.15433 5.771 3.463 5.463C3.77167 5.155 4.15567 5.00067 4.615 5H19.385C19.845 5 20.229 5.15433 20.537 5.463C20.845 5.77167 20.9993 6.156 21 6.616V17.385C21 17.845 20.8457 18.2293 20.537 18.538C20.2283 18.8467 19.8443 19.0007 19.385 19H4.616ZM12 12.116L20 6.885L19.692 6L12 11L4.308 6L4 6.885L12 12.116Z"
                      fill="white"
                    />
                  </svg>
                  support@x-fine.live
                </a>
              </div>

              <div className="footer__col">
                <ul className="footer__col-menu">
                  <li>
                    <a href="https://x-fine.com/de/" className="body-text text-white">XFINE</a>
                  </li>
                  <li>
                    <a href="#challenges" className="body-text text-white">Challenges</a>
                  </li>
                  <li>
                    <a href="#faq" className="body-text text-white">FAQ</a>
                  </li>
                  <li>
                    <a href="#why" className="body-text text-white">Über uns</a>
                  </li>
                </ul>
              </div>

              <div className="footer__col">
                <ul className="footer__col-socials">
                  <li>
                    <a href="https://www.instagram.com/xfinecom?igsh=dmd4c3FqYjBiejIz&utm_source=qr">
                      <img
                        src="https://propxfine.com/wp-content/uploads/2025/04/inst.svg"
                        loading="lazy"
                        alt="Instagram"
                      />
                    </a>
                  </li>
                  <li>
                    <a href="https://www.facebook.com/profile.php?id=61573072358254">
                      <img
                        src="https://propxfine.com/wp-content/uploads/2025/04/facebook.svg"
                        loading="lazy"
                        alt="Facebook"
                      />
                    </a>
                  </li>
                  <li>
                    <a href="https://t.me/xfineeng">
                      <img
                        src="https://propxfine.com/wp-content/uploads/2025/04/tg-1.svg"
                        loading="lazy"
                        alt="Telegram"
                      />
                    </a>
                  </li>
                  <li>
                    <a href="https://www.linkedin.com/in/xfine-broker-a65046351?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app">
                      <img
                        src="https://propxfine.com/wp-content/uploads/2025/04/link.svg"
                        loading="lazy"
                        alt="LinkedIn"
                      />
                    </a>
                  </li>
                  <li>
                    <a href="https://x.com/xfine_global">
                      <img
                        src="https://propxfine.com/wp-content/uploads/2025/05/youtube-1.svg"
                        loading="lazy"
                        alt="X (Twitter)"
                      />
                    </a>
                  </li>
                  <li>
                    <a href="https://www.youtube.com/@XFINEBROKER">
                      <img
                        src="https://propxfine.com/wp-content/uploads/2025/04/youtube.svg"
                        loading="lazy"
                        alt="YouTube"
                      />
                    </a>
                  </li>
                </ul>
              </div>
            </div>

          </div>

          <div className="footer__text secondary-text text-white">
            XFine Ltd. ist in St. Lucia unter der Registrierungsnummer 2024-00596 registriert und in dem von der Financial Services Regulatory Authority (FSRA) geführten Register aufgeführt.
            <br /><br />
            Unsere Dienstleistungen sind für Personen mit Wohnsitz in bestimmten Jurisdiktion, wie z.B. den Vereinigten Staaten, nicht verfügbar. Der Inhalt dieser Website und die angebotenen Produkte/Dienstleistungen sind nicht für die Nutzung durch Personen in Ländern und/oder Jurisdiktion bestimmt, in denen eine solche Nutzung gegen lokale Gesetze oder Vorschriften verstoßen könnte.
            <br /><br />
            XFINE weist darauf hin, dass der Handel mit Margen auf den Finanzmärkten mit einem erhöhten Risiko verbunden ist und zum Verlust von Investitionsgeldern führen kann. Bitte vergewissern Sie sich beim Handel, dass Sie sich der damit verbundenen Risiken voll bewusst sind und dass Sie über die entsprechenden und ausreichenden Kenntnisse und Erfahrungen verfügen, die für den Handel auf dem Forexmarkt erforderlich sind.
          </div>
        </div>
      </footer>
    </main>
  );
}
