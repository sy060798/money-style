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


// =====================================================
// ELEMENT
// =====================================================

const scanButton = document.getElementById("scanButton");
const stockResults = document.getElementById("stockResults");
const resultCount = document.getElementById("resultCount");
const scanTime = document.getElementById("scanTime");
const marketStatus = document.getElementById("marketStatus");


// =====================================================
// SETTINGS
// =====================================================

const DEFAULT_SETTINGS = {
    lookback: 150,
    pocLookback: 50,
    bins: 30,
    valueAreaPercent: 70,

    volumePeriod: 20,
    volumeSpikeMult: 2,

    confirmTicks: 1,
    redZoneBins: 1,
    maxDistanceBins: 2
};


// =====================================================
// GET TICKERS
// =====================================================

function getTickers() {

    const tickers = [];

    for (let i = 1; i <= 5; i++) {

        const input =
            document.getElementById(`ticker${i}`);

        if (!input) {
            continue;
        }

        const ticker =
            input.value
                .trim()
                .toUpperCase();

        if (ticker) {
            tickers.push(ticker);
        }
    }

    // Hapus ticker duplikat
    return [...new Set(tickers)];
}


// =====================================================
// FORMAT NUMBER
// =====================================================

function formatPrice(value) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(value)
    ) {
        return "-";
    }

    return new Intl.NumberFormat(
        "id-ID",
        {
            maximumFractionDigits: 2
        }
    ).format(value);
}


// =====================================================
// FORMAT PERCENT
// =====================================================

function formatPercent(value) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(value)
    ) {
        return "-";
    }

    const sign =
        value > 0 ? "+" : "";

    return (
        sign +
        value.toFixed(2) +
        "%"
    );
}


// =====================================================
// FORMAT VOLUME RATIO
// =====================================================

function formatVolumeRatio(value) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(value)
    ) {
        return "-";
    }

    return value.toFixed(2) + "x";
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =====================================================
// STATUS CLASS
// =====================================================

function getStatusClass(status) {

    const value =
        String(status || "")
            .toUpperCase();

    if (value.includes("BUY")) {
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

    if (signal.buySignal) {
        return "BUY";
    }

    if (signal.dump) {
        return "DUMP";
    }

    if (signal.tooFarBelow) {
        return "POC LOST";
    }

    if (signal.waitingRecovery) {
        return "WAIT / RECOVERY";
    }

    if (signal.insideRedZone) {
        return "AREA MERAH";
    }

    if (signal.belowRedZone) {
        return "DI BAWAH POC";
    }

    if (signal.aboveRedZone) {
        return "DI ATAS POC";
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

    if (signal.tooFarBelow) {

        return {
            text: "INVALID / TERLALU JAUH",
            className: "invalid"
        };
    }

    if (signal.buySignal) {

        return {
            text: "BUY TERKONFIRMASI",
            className: "valid"
        };
    }

    if (signal.waitingRecovery) {

        return {
            text: "MENUNGGU RECOVERY",
            className: ""
        };
    }

    if (signal.insideRedZone) {

        return {
            text: "VALID AREA",
            className: "valid"
        };
    }

    return {
        text: "WAIT",
        className: ""
    };
}


// =====================================================
// RENDER ERROR
// =====================================================

function renderError(ticker, message) {

    return `
        <article class="stock-card">

            <div class="stock-header">

                <div class="stock-name">

                    <h3>
                        ${escapeHTML(ticker)}
                    </h3>

                    <span>
                        MARKET DATA ERROR
                    </span>

                </div>

                <span class="status-badge status-dump">
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
                    ${escapeHTML(message)}
                </span>

            </div>

        </article>
    `;
}


// =====================================================
// RENDER STOCK CARD
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
        getStatusText(signal);

    const statusClass =
        getStatusClass(status);

    const validation =
        getValidationText(signal);


    const volumeColor =
        volume.volumeSpike
            ? "orange"
            : "";


    const signalColor =
        signal.buySignal
            ? "green"
            : signal.dump || signal.tooFarBelow
                ? "red"
                : signal.waitingRecovery
                    ? "orange"
                    : "";


    return `

        <article class="stock-card">

            <!-- ================================= -->
            <!-- HEADER -->
            <!-- ================================= -->

            <div class="stock-header">

                <div class="stock-name">

                    <div>

                        <h3>
                            ${escapeHTML(ticker)}
                        </h3>

                        <span>
                            LIVE MARKET DATA
                        </span>

                    </div>

                </div>

                <span
                    class="status-badge ${statusClass}"
                >
                    ${escapeHTML(status)}
                </span>

            </div>


            <!-- ================================= -->
            <!-- PRICE -->
            <!-- ================================= -->

            <div class="stock-price">

                <span class="price">
                    ${formatPrice(price)}
                </span>

                <span
                    class="change ${
                        changePercent >= 0
                            ? "change-up"
                            : "change-down"
                    }"
                >
                    ${formatPercent(changePercent)}
                </span>

            </div>


            <!-- ================================= -->
            <!-- DATA -->
            <!-- ================================= -->

            <div class="data-grid">

                <div class="data-item">

                    <span class="data-label">
                        POC AKTIF
                    </span>

                    <span class="data-value red">
                        ${formatPrice(profile.pocPrice)}
                    </span>

                </div>


                <div class="data-item">

                    <span class="data-label">
                        RED ZONE
                    </span>

                    <span class="data-value">
                        ${formatPrice(profile.redZoneLow)}
                        -
                        ${formatPrice(profile.redZoneHigh)}
                    </span>

                </div>


                <div class="data-item">

                    <span class="data-label">
                        VOLUME
                    </span>

                    <span
                        class="data-value ${volumeColor}"
                    >
                        ${formatVolumeRatio(
                            volume.volumeRatio
                        )}
                    </span>

                </div>


                <div class="data-item">

                    <span class="data-label">
                        VAH
                    </span>

                    <span class="data-value orange">
                        ${formatPrice(
                            profile.valueAreaHigh
                        )}
                    </span>

                </div>


                <div class="data-item">

                    <span class="data-label">
                        VAL
                    </span>

                    <span class="data-value green">
                        ${formatPrice(
                            profile.valueAreaLow
                        )}
                    </span>

                </div>


                <div class="data-item">

                    <span class="data-label">
                        POC LOOKBACK
                    </span>

                    <span class="data-value blue">
                        ${DEFAULT_SETTINGS.pocLookback}
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
                        ${DEFAULT_SETTINGS.bins} LEVEL
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
                                    profile.profileStrength || 0
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
                                    profile.pocPosition || 50
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
                    ${escapeHTML(status)}
                </span>

            </div>


            <!-- ================================= -->
            <!-- VALIDATION -->
            <!-- ================================= -->

            <div
                class="validation ${validation.className}"
            >
                BUY VALIDASI:
                ${escapeHTML(validation.text)}
            </div>

        </article>
    `;
}


// =====================================================
// LOADING
// =====================================================

function showLoading() {

    stockResults.innerHTML = `

        <div class="loading-state">

            <div class="loading-spinner"></div>

            Mengambil market data...

        </div>
    `;

    resultCount.textContent =
        "SCANNING";

    marketStatus.textContent =
        "FETCHING DATA";
}


// =====================================================
// EMPTY
// =====================================================

function showEmpty() {

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

    resultCount.textContent =
        "0 SAHAM";
}


// =====================================================
// SCAN ONE STOCK
// =====================================================

async function scanStock(ticker) {

    try {

        // ---------------------------------------------
        // 1. AMBIL DATA MARKET NYATA
        // ---------------------------------------------

        const marketData =
            await getMarketData(ticker);


        if (
            !marketData ||
            !Array.isArray(marketData.bars) ||
            marketData.bars.length === 0
        ) {

            throw new Error(
                "Tidak ada data market"
            );
        }


        // ---------------------------------------------
        // 2. PROFILE
        // ---------------------------------------------

        const profile =
            calculateProfile(
                marketData.bars,
                DEFAULT_SETTINGS
            );


        // ---------------------------------------------
        // 3. VOLUME
        // ---------------------------------------------

        const volume =
            calculateVolume(
                marketData.bars,
                DEFAULT_SETTINGS
            );


        // ---------------------------------------------
        // 4. SIGNAL
        // ---------------------------------------------

        const signal =
            calculateSignal(
                marketData.bars,
                profile,
                volume,
                DEFAULT_SETTINGS
            );


        // ---------------------------------------------
        // 5. RETURN
        // ---------------------------------------------

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
                "Gagal mengambil data"
        };
    }
}


// =====================================================
// SCAN ALL
// =====================================================

async function scanAll() {

    const tickers =
        getTickers();


    if (tickers.length === 0) {

        showEmpty();

        scanTime.textContent =
            "Belum ada ticker";

        return;
    }


    showLoading();


    scanButton.classList.add(
        "loading"
    );


    try {

        // Jalankan request secara paralel
        const results =
            await Promise.all(
                tickers.map(
                    ticker =>
                        scanStock(ticker)
                )
            );


        // ---------------------------------------------
        // RENDER
        // ---------------------------------------------

        stockResults.innerHTML =
            results
                .map(result => {

                    if (result.error) {

                        return renderError(
                            result.ticker,
                            result.error
                        );
                    }

                    return renderStock(
                        result
                    );

                })
                .join("");


        resultCount.textContent =
            `${results.length} SAHAM`;


        const now =
            new Date();


        scanTime.textContent =
            `Update ${now.toLocaleTimeString(
                "id-ID",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            )}`;


        marketStatus.textContent =
            "DATA TERHUBUNG";

    } catch (error) {

        console.error(error);

        stockResults.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    !
                </div>

                <h3>
                    Gagal mengambil data
                </h3>

                <p>
                    Periksa koneksi atau sumber market data.
                </p>

            </div>
        `;

        marketStatus.textContent =
            "DATA ERROR";

    } finally {

        scanButton.classList.remove(
            "loading"
        );
    }
}


// =====================================================
// BUTTON
// =====================================================

scanButton.addEventListener(
    "click",
    scanAll
);


// =====================================================
// ENTER KEY
// =====================================================

document
    .querySelectorAll(
        ".ticker-inputs input"
    )
    .forEach(input => {

        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {
                    scanAll();
                }

            }
        );

    });


// =====================================================
// INITIAL STATE
// =====================================================

showEmpty();
