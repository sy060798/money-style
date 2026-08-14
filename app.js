// =====================================================
// MONEY STYLE SCANNER
// app.js
// =====================================================

import { getMarketData } from "./api/market.js";

import {
    calculateProfile
} from "./engine/profile.js";

import {
    calculateVolume
} from "./engine/volume.js";

import {
    calculateSignal
} from "./engine/signal.js";

import {
    SETTINGS
} from "./config/settings.js";


// =====================================================
// ELEMENT
// =====================================================

const scanButton =
    document.getElementById("scanButton");

const stockResults =
    document.getElementById("stockResults");

const resultCount =
    document.getElementById("resultCount");

const scanTime =
    document.getElementById("scanTime");

const marketStatus =
    document.getElementById("marketStatus");


// =====================================================
// VALIDASI ELEMENT
// =====================================================

if (!stockResults) {
    console.error(
        "Money Style Scanner: #stockResults tidak ditemukan."
    );
}


// =====================================================
// GET TICKERS
// =====================================================

function getTickers() {

    const tickers = [];

    const maxStocks =
        Number(SETTINGS.maxStocks) || 5;

    for (
        let i = 1;
        i <= maxStocks;
        i++
    ) {

        const input =
            document.getElementById(
                `ticker${i}`
            );

        if (!input) {
            continue;
        }

        const ticker =
            input.value
                .trim()
                .toUpperCase()
                .replace(/\s+/g, "");

        if (ticker) {
            tickers.push(ticker);
        }
    }

    return [
        ...new Set(tickers)
    ];
}


// =====================================================
// FORMAT PRICE
// =====================================================

function formatPrice(value) {

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {
        return "-";
    }

    return new Intl.NumberFormat(
        "id-ID",
        {
            maximumFractionDigits: 2
        }
    ).format(number);
}


// =====================================================
// FORMAT PERCENT
// =====================================================

function formatPercent(value) {

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {
        return "-";
    }

    const sign =
        number > 0
            ? "+"
            : "";

    return (
        sign +
        number.toFixed(2) +
        "%"
    );
}


// =====================================================
// FORMAT VOLUME RATIO
// =====================================================

function formatVolumeRatio(value) {

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {
        return "-";
    }

    return (
        number.toFixed(2) +
        "x"
    );
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


// =====================================================
// STATUS CLASS
// =====================================================

function getStatusClass(status) {

    const value =
        String(status || "")
            .toUpperCase();

    if (
        value === "BUY"
    ) {
        return "status-buy";
    }

    if (
        value.includes("WAIT") ||
        value.includes("RECOVERY") ||
        value.includes("AREA")
    ) {
        return "status-wait";
    }

    if (
        value.includes("DUMP") ||
        value.includes("LOST")
    ) {
        return "status-dump";
    }

    return "status-normal";
}


// =====================================================
// STATUS TEXT
// =====================================================

function getStatusText(signal) {

    if (!signal) {
        return "NORMAL";
    }

    // ---------------------------------------------
    // Prioritas dari signal.js
    // ---------------------------------------------

    if (
        signal.status
    ) {
        return String(
            signal.status
        );
    }

    if (
        signal.signal
    ) {
        return String(
            signal.signal
        );
    }

    return "NORMAL";
}


// =====================================================
// VALIDATION TEXT
// =====================================================

function getValidationText(signal) {

    if (!signal) {

        return {
            text: "WAIT",
            className: ""
        };
    }


    const validation =
        String(
            signal.validation || ""
        );


    if (
        validation === "BUY VALID"
    ) {

        return {
            text: "BUY VALID",
            className: "valid"
        };
    }


    if (
        validation.includes(
            "INVALID"
        )
    ) {

        return {
            text: validation,
            className: "invalid"
        };
    }


    if (
        validation ===
        "MENUNGGU RECOVERY"
    ) {

        return {
            text: validation,
            className: ""
        };
    }


    if (
        validation ===
        "VALID AREA"
    ) {

        return {
            text: validation,
            className: "valid"
        };
    }


    return {
        text:
            validation ||
            "WAIT",
        className: ""
    };
}


// =====================================================
// SIGNAL COLOR
// =====================================================

function getSignalColor(signal) {

    if (!signal) {
        return "";
    }

    const value =
        String(
            signal.signal || ""
        )
            .toUpperCase();


    if (
        value === "BUY"
    ) {
        return "green";
    }


    if (
        value === "DUMP" ||
        value === "POC LOST"
    ) {
        return "red";
    }


    if (
        value === "WAIT" ||
        value === "AREA MERAH"
    ) {
        return "orange";
    }


    return "";
}


// =====================================================
// RENDER ERROR
// =====================================================

function renderError(
    ticker,
    message
) {

    return `

        <article class="stock-card">

            <div class="stock-header">

                <div class="stock-name">

                    <h3>
                        ${escapeHTML(
                            ticker
                        )}
                    </h3>

                    <span>
                        MARKET DATA ERROR
                    </span>

                </div>

                <span
                    class="status-badge status-dump"
                >
                    ERROR
                </span>

            </div>


            <div class="signal-box">

                <span class="signal-label">
                    DATA
                </span>

                <span
                    class="signal-value"
                    style="color:#ff4d5e"
                >
                    ${escapeHTML(
                        message
                    )}
                </span>

            </div>

        </article>
    `;
}


// =====================================================
// RENDER STOCK
// =====================================================

function renderStock(data) {

    const {
        ticker,
        price,
        changePercent,
        profile,
        volume,
        signal
    } = data;


    const status =
        getStatusText(
            signal
        );


    const statusClass =
        getStatusClass(
            status
        );


    const validation =
        getValidationText(
            signal
        );


    const volumeRatio =
        volume?.volumeRatio ??
        null;


    const volumeSpike =
        volume?.volumeSpike ??
        false;


    const volumeColor =
        volumeSpike
            ? "orange"
            : "";


    const signalColor =
        getSignalColor(
            signal
        );


    const pocPrice =
        profile?.pocPrice;


    const redZoneLow =
        profile?.redZoneLow;


    const redZoneHigh =
        profile?.redZoneHigh;


    const valueAreaHigh =
        profile?.valueAreaHigh;


    const valueAreaLow =
        profile?.valueAreaLow;


    const pocLookback =
        profile?.pocLookback ??
        SETTINGS.pocLookback;


    const bins =
        profile?.bins ??
        SETTINGS.bins;


    const profileStrength =
        Number(
            profile?.profileStrength
        ) || 0;


    const pocPosition =
        Number(
            profile?.pocPosition
        );


    const safePocPosition =
        Number.isFinite(
            pocPosition
        )
            ? pocPosition
            : 50;


    const score =
        Number(
            signal?.score
        ) || 0;


    return `

        <article class="stock-card">


            <!-- ================================= -->
            <!-- HEADER -->
            <!-- ================================= -->

            <div class="stock-header">

                <div class="stock-name">

                    <div>

                        <h3>
                            ${escapeHTML(
                                ticker
                            )}
                        </h3>

                        <span>
                            LIVE MARKET DATA
                        </span>

                    </div>

                </div>


                <span
                    class="status-badge ${statusClass}"
                >
                    ${escapeHTML(
                        status
                    )}
                </span>

            </div>


            <!-- ================================= -->
            <!-- PRICE -->
            <!-- ================================= -->

            <div class="stock-price">

                <span class="price">
                    ${formatPrice(
                        price
                    )}
                </span>


                <span
                    class="change ${
                        Number(
                            changePercent
                        ) >= 0
                            ? "change-up"
                            : "change-down"
                    }"
                >
                    ${formatPercent(
                        changePercent
                    )}
                </span>

            </div>


            <!-- ================================= -->
            <!-- DATA GRID -->
            <!-- ================================= -->

            <div class="data-grid">


                <!-- POC -->

                <div class="data-item">

                    <span class="data-label">
                        POC AKTIF
                    </span>

                    <span class="data-value red">
                        ${formatPrice(
                            pocPrice
                        )}
                    </span>

                </div>


                <!-- RED ZONE -->

                <div class="data-item">

                    <span class="data-label">
                        RED ZONE
                    </span>

                    <span class="data-value">

                        ${formatPrice(
                            redZoneLow
                        )}

                        -

                        ${formatPrice(
                            redZoneHigh
                        )}

                    </span>

                </div>


                <!-- VOLUME -->

                <div class="data-item">

                    <span class="data-label">
                        VOLUME
                    </span>

                    <span
                        class="data-value ${volumeColor}"
                    >
                        ${formatVolumeRatio(
                            volumeRatio
                        )}
                    </span>

                </div>


                <!-- VAH -->

                <div class="data-item">

                    <span class="data-label">
                        VAH
                    </span>

                    <span class="data-value orange">
                        ${formatPrice(
                            valueAreaHigh
                        )}
                    </span>

                </div>


                <!-- VAL -->

                <div class="data-item">

                    <span class="data-label">
                        VAL
                    </span>

                    <span class="data-value green">
                        ${formatPrice(
                            valueAreaLow
                        )}
                    </span>

                </div>


                <!-- POC LOOKBACK -->

                <div class="data-item">

                    <span class="data-label">
                        POC LOOKBACK
                    </span>

                    <span class="data-value blue">
                        ${escapeHTML(
                            pocLookback
                        )}
                    </span>

                </div>

            </div>


            <!-- ================================= -->
            <!-- PROFILE -->
            <!-- ================================= -->

            <div class="profile-section">

                <div class="profile-title">

                    <span>
                        ACTIVE PROFILE
                    </span>

                    <span>
                        ${escapeHTML(
                            bins
                        )} LEVEL
                    </span>

                </div>


                <div class="profile-bar">

                    <div
                        class="profile-fill"
                        style="
                            width:
                            ${Math.max(
                                5,
                                Math.min(
                                    100,
                                    profileStrength
                                )
                            )}%;
                        "
                    ></div>

                </div>


                <div class="poc-visual">

                    <div class="poc-track"></div>


                    <div
                        class="poc-marker"
                        style="
                            left:
                            ${Math.max(
                                0,
                                Math.min(
                                    100,
                                    safePocPosition
                                )
                            )}%;
                        "
                    ></div>

                </div>

            </div>


            <!-- ================================= -->
            <!-- SIGNAL -->
            <!-- ================================= -->

            <div class="signal-box">

                <span class="signal-label">
                    SIGNAL
                </span>


                <span
                    class="signal-value ${signalColor}"
                >
                    ${escapeHTML(
                        signal?.signal ||
                        status
                    )}
                </span>

            </div>


            <!-- ================================= -->
            <!-- SCORE -->
            <!-- ================================= -->

            <div class="validation">

                SCORE:
                ${escapeHTML(
                    score
                )}/100

            </div>


            <!-- ================================= -->
            <!-- VALIDATION -->
            <!-- ================================= -->

            <div
                class="validation ${validation.className}"
            >

                BUY VALIDASI:

                ${escapeHTML(
                    validation.text
                )}

            </div>


            <!-- ================================= -->
            <!-- OPTIONAL RECOVERY INFO -->
            <!-- ================================= -->

            ${
                signal?.waitingRecovery
                    ? `

                    <div class="validation">

                        RECOVERY:

                        ${formatPrice(
                            signal.recoveryPrice
                        )}

                    </div>

                    `
                    : ""
            }

        </article>
    `;
}


// =====================================================
// LOADING
// =====================================================

function showLoading() {

    if (!stockResults) {
        return;
    }


    stockResults.innerHTML = `

        <div class="loading-state">

            <div class="loading-spinner"></div>

            Mengambil market data...

        </div>
    `;


    if (resultCount) {

        resultCount.textContent =
            "SCANNING";

    }


    if (marketStatus) {

        marketStatus.textContent =
            "FETCHING DATA";

    }
}


// =====================================================
// EMPTY
// =====================================================

function showEmpty() {

    if (!stockResults) {
        return;
    }


    stockResults.innerHTML = `

        <div class="empty-state">

            <div class="empty-icon">
                ◎
            </div>

            <h3>
                Belum ada data
            </h3>

            <p>
                Masukkan ticker saham kemudian tekan
                <strong>SCAN</strong>.
            </p>

        </div>
    `;


    if (resultCount) {

        resultCount.textContent =
            "0 SAHAM";

    }
}


// =====================================================
// SCAN ONE STOCK
// =====================================================

async function scanStock(
    ticker
) {

    try {

        // =============================================
        // 1. MARKET DATA
        // =============================================

        const marketData =
            await getMarketData(
                ticker
            );


        if (
            !marketData ||
            !Array.isArray(
                marketData.bars
            ) ||
            marketData.bars.length === 0
        ) {

            throw new Error(
                "Tidak ada data market."
            );
        }


        console.log(
            `[${ticker}] Market data:`,
            marketData.bars.length,
            "candle"
        );


        // =============================================
        // 2. PROFILE
        // =============================================

        const profile =
            calculateProfile(
                marketData.bars,
                SETTINGS
            );


        if (!profile) {

            throw new Error(
                "Profile tidak dapat dihitung."
            );
        }


        // =============================================
        // 3. VOLUME
        // =============================================

        const volume =
            calculateVolume(
                marketData.bars,
                SETTINGS
            );


        if (!volume) {

            throw new Error(
                `Data volume belum cukup. ` +
                `Butuh minimal ${SETTINGS.volumePeriod} candle.`
            );
        }


        // =============================================
        // 4. SIGNAL
        // =============================================

        const signal =
            calculateSignal(
                marketData.bars,
                profile,
                volume,
                SETTINGS
            );


        if (!signal) {

            throw new Error(
                "Signal tidak dapat dihitung."
            );
        }


        // =============================================
        // 5. RESULT
        // =============================================

        return {

            ticker,

            price:
                marketData.price,

            changePercent:
                marketData.changePercent,

            profile,

            volume,

            signal

        };

    } catch (error) {

        console.error(
            `Scanner error: ${ticker}`,
            error
        );


        return {

            ticker,

            error:
                error?.message ||
                "Gagal mengambil data."

        };
    }
}


// =====================================================
// SCAN ALL
// =====================================================

async function scanAll() {

    const tickers =
        getTickers();


    if (
        tickers.length === 0
    ) {

        showEmpty();


        if (scanTime) {

            scanTime.textContent =
                "Belum ada ticker";

        }

        return;
    }


    showLoading();


    if (scanButton) {

        scanButton.classList.add(
            "loading"
        );

    }


    try {

        // =============================================
        // REQUEST PARALEL
        // =============================================

        const results =
            await Promise.all(
                tickers.map(
                    ticker =>
                        scanStock(
                            ticker
                        )
                )
            );


        // =============================================
        // RENDER
        // =============================================

        if (stockResults) {

            stockResults.innerHTML =
                results
                    .map(
                        result => {

                            if (
                                result.error
                            ) {

                                return renderError(
                                    result.ticker,
                                    result.error
                                );
                            }

                            return renderStock(
                                result
                            );

                        }
                    )
                    .join("");

        }


        // =============================================
        // COUNT
        // =============================================

        if (resultCount) {

            resultCount.textContent =
                `${results.length} SAHAM`;

        }


        // =============================================
        // TIME
        // =============================================

        const now =
            new Date();


        if (scanTime) {

            scanTime.textContent =
                `Update ${now.toLocaleTimeString(
                    "id-ID",
                    {
                        hour:
                            "2-digit",

                        minute:
                            "2-digit",

                        second:
                            "2-digit"
                    }
                )}`;

        }


        // =============================================
        // MARKET STATUS
        // =============================================

        const successCount =
            results.filter(
                result =>
                    !result.error
            ).length;


        if (marketStatus) {

            if (
                successCount ===
                results.length
            ) {

                marketStatus.textContent =
                    "DATA TERHUBUNG";

            } else if (
                successCount > 0
            ) {

                marketStatus.textContent =
                    "DATA SEBAGIAN TERHUBUNG";

            } else {

                marketStatus.textContent =
                    "DATA ERROR";

            }

        }

    } catch (error) {

        console.error(
            "Scan error:",
            error
        );


        if (stockResults) {

            stockResults.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        !
                    </div>

                    <h3>
                        Gagal mengambil data
                    </h3>

                    <p>
                        ${
                            escapeHTML(
                                error?.message ||
                                "Periksa koneksi atau sumber market data."
                            )
                        }
                    </p>

                </div>
            `;

        }


        if (marketStatus) {

            marketStatus.textContent =
                "DATA ERROR";

        }

    } finally {

        if (scanButton) {

            scanButton.classList.remove(
                "loading"
            );

        }

    }
}


// =====================================================
// BUTTON
// =====================================================

if (scanButton) {

    scanButton.addEventListener(
        "click",
        scanAll
    );

}


// =====================================================
// ENTER KEY
// =====================================================

document
    .querySelectorAll(
        ".ticker-inputs input"
    )
    .forEach(
        input => {

            input.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter"
                    ) {

                        event.preventDefault();

                        scanAll();

                    }

                }
            );

        }
    );


// =====================================================
// INITIAL STATE
// =====================================================

showEmpty();
