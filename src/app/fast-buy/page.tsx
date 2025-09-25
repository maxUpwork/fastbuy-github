import FastBuy from '@/components/FastBuy';

export default function FastBuyPage() {
    return (
        <div>
            <header className="header">
                <div className="container">
                    <div className="header__inner">
                        <a href="#" className="logo">
                            <img
                                src="https://propxfine.com/wp-content/themes/xfine_1734700332/prop-landing/assets/img/logo.svg"
                                alt="Logo"
                            />
                        </a>

                        <div className="header__buttons">
                            <div className="language-swicher parent">
                                <div className="current-lang">
                                    <img
                                        src="https://propxfine.com/wp-content/plugins/polylang/flags/de.png"
                                        alt="Deutsch"
                                        className="current-language"
                                        width="20"
                                    />
                                    <span>de</span>

                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <g clipPath="url(#clip0_177_3326)">
                                            <path
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                d="M12.7083 15.707C12.5208 15.8944 12.2665 15.9998 12.0013 15.9998C11.7362 15.9998 11.4818 15.8944 11.2943 15.707L5.63732 10.05C5.54181 9.95773 5.46563 9.84739 5.41322 9.72538C5.36081 9.60338 5.33322 9.47216 5.33207 9.33938C5.33092 9.2066 5.35622 9.07492 5.4065 8.95202C5.45678 8.82913 5.53103 8.71747 5.62492 8.62358C5.71882 8.52969 5.83047 8.45544 5.95337 8.40515C6.07626 8.35487 6.20794 8.32957 6.34072 8.33073C6.4735 8.33188 6.60472 8.35947 6.72672 8.41188C6.84873 8.46428 6.95907 8.54047 7.05132 8.63598L12.0013 13.586L16.9513 8.63598C17.1399 8.45382 17.3925 8.35302 17.6547 8.3553C17.9169 8.35758 18.1677 8.46275 18.3531 8.64816C18.5385 8.83357 18.6437 9.08438 18.646 9.34658C18.6483 9.60877 18.5475 9.86137 18.3653 10.05L12.7083 15.707Z"
                                                fill="white"
                                            />
                                        </g>
                                        <defs>
                                            <clipPath id="clip0_177_3326">
                                                <rect width="24" height="24" fill="white" />
                                            </clipPath>
                                        </defs>
                                    </svg>
                                </div>

                                <div className="children">
                                    <a href="https://propxfine.com/en/" className="dropdown-link w-dropdown-link">
                                        <img
                                            src="https://propxfine.com/wp-content/plugins/polylang/flags/gb.png"
                                            alt="English"
                                            width="24"
                                        />
                                    </a>
                                    <a href="https://propxfine.com/ru/" className="dropdown-link w-dropdown-link">
                                        <img
                                            src="https://propxfine.com/wp-content/plugins/polylang/flags/ru.png"
                                            alt="Русский"
                                            width="24"
                                        />
                                    </a>
                                    <a href="https://propxfine.com/kk/" className="dropdown-link w-dropdown-link">
                                        <img
                                            src="https://propxfine.com/wp-content/plugins/polylang/flags/kz.png"
                                            alt="Kazakh"
                                            width="24"
                                        />
                                    </a>
                                    <a href="https://propxfine.com/ua/" className="dropdown-link w-dropdown-link">
                                        <img
                                            src="https://propxfine.com/wp-content/plugins/polylang/flags/ua.png"
                                            alt="Українська"
                                            width="24"
                                        />
                                    </a>
                                    <a href="https://propxfine.com/zh/" className="dropdown-link w-dropdown-link">
                                        <img
                                            src="https://propxfine.com/wp-content/plugins/polylang/flags/cn.png"
                                            alt="中文 (中国)"
                                            width="24"
                                        />
                                    </a>
                                    <a href="https://propxfine.com/es/" className="dropdown-link w-dropdown-link">
                                        <img
                                            src="https://propxfine.com/wp-content/plugins/polylang/flags/es.png"
                                            alt="Español"
                                            width="24"
                                        />
                                    </a>
                                    <a href="https://propxfine.com/uz/" className="dropdown-link w-dropdown-link">
                                        <img
                                            src="https://propxfine.com/wp-content/plugins/polylang/flags/uz.png"
                                            alt="Oʻzbek"
                                            width="24"
                                        />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="fast-buy" id="fast-buy">
                <div className="container">
                    <h1>Choose the <span>best</span>  plan</h1>
                    <div className="fast-buy__inner">
                        <FastBuy />
                    </div>
                </div>
            </main>
        </div>
    );
}
