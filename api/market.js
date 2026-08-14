// =====================================================
// MONEY STYLE SCANNER
// api/market.js
// INDONESIA STOCK EXCHANGE / XIDX
// =====================================================

const API_KEY =
    "53c7109a9a114a65847c1f15afa69db1";

const BASE_URL =
    "https://api.twelvedata.com";


// =====================================================
// SETTINGS
// =====================================================

const MARKET_SETTINGS = {

    interval: "1day",

    // Butuh minimal 150 candle
    // untuk profile.
    outputsize: 180,

    // Indonesia
    exchange: "IDX",

    country: "Indonesia"
};


// =====================================================
// VALIDASI API KEY
// =====================================================

function validateApiKey() {

    if (
        !API_KEY ||
        API_KEY ===
        "ISI_API_KEY_TWELVE_DATA_DI_SINI"
    ) {

        throw new Error(
            "API key Twelve Data belum diisi"
        );
    }
}


// =====================================================
// REQUEST JSON
// =====================================================

async function fetchJSON(url) {

    const response =
        await fetch(url);

    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status}`
        );
    }

    const data =
        await response.json();

    return data;
}


// =====================================================
// CARI SYMBOL INDONESIA
// =====================================================
//
// Input:
// BBCA
// BBRI
// PTPP
// GOTO
//
// Dicari melalui symbol_search.
// Hasil kemudian difilter agar hanya
// saham Indonesia.
// =====================================================

async function searchIndonesiaStock(
    ticker
) {

    const params =
        new URLSearchParams({

            symbol: ticker,

            apikey: API_KEY

        });


    const url =
        `${BASE_URL}/symbol_search?${params.toString()}`;


    const data =
        await fetchJSON(url);


    if (
        data.status === "error" ||
        data.code
    ) {

        throw new Error(
            data.message ||
            `Gagal mencari ${ticker}`
        );
    }


    const results =
        Array.isArray(data.data)
            ? data.data
            : [];


    if (results.length === 0) {

        throw new Error(
            `${ticker} tidak ditemukan di Twelve Data`
        );
    }


    // -------------------------------------------------
    // FILTER INDONESIA
    // -------------------------------------------------

    const indonesia =
        results.filter(item => {

            const country =
                String(
                    item.country || ""
                ).toLowerCase();

            const exchange =
                String(
                    item.exchange || ""
                ).toUpperCase();

            const mic =
                String(
                    item.mic_code || ""
                ).toUpperCase();

            return (
                country === "indonesia" ||
                exchange === "IDX" ||
                exchange.includes(
                    "INDONESIA"
                ) ||
                mic === "XIDX"
            );

        });


    if (indonesia.length === 0) {

        throw new Error(
            `${ticker} ditemukan, tetapi bukan saham Indonesia/XIDX`
        );
    }


    // -------------------------------------------------
    // PRIORITASKAN SYMBOL PERSIS
    // -------------------------------------------------

    const exact =
        indonesia.find(item =>
            String(
                item.symbol || ""
            ).toUpperCase() ===
            ticker.toUpperCase()
        );


    return exact || indonesia[0];
}


// =====================================================
// AMBIL TIME SERIES
// =====================================================

async function getTimeSeries(
    symbol
) {

    const params =
        new URLSearchParams({

            symbol,

            interval:
                MARKET_SETTINGS.interval,

            outputsize:
                String(
                    MARKET_SETTINGS.outputsize
                ),

            apikey:
                API_KEY

        });


    // -------------------------------------------------
    // exchange ditambahkan jika tersedia
    // -------------------------------------------------

    const url =
        `${BASE_URL}/time_series?${params.toString()}`;


    const data =
        await fetchJSON(url);


    // -------------------------------------------------
    // API ERROR
    // -------------------------------------------------

    if (
        data.status === "error" ||
        data.code
    ) {

        throw new Error(
            data.message ||
            `Time series ${symbol} gagal`
        );
    }


    if (
        !Array.isArray(data.values) ||
        data.values.length === 0
    ) {

        throw new Error(
            `Tidak ada candle untuk ${symbol}`
        );
    }


    return data;
}


// =====================================================
// NORMALIZE CANDLE
// =====================================================

function normalizeBars(
    values
) {

    return values

        .map(row => ({

            datetime:
                row.datetime,

            open:
                Number(row.open),

            high:
                Number(row.high),

            low:
                Number(row.low),

            close:
                Number(row.close),

            volume:
                Number(row.volume)

        }))

        .filter(bar =>

            Number.isFinite(
                bar.open
            ) &&

            Number.isFinite(
                bar.high
            ) &&

            Number.isFinite(
                bar.low
            ) &&

            Number.isFinite(
                bar.close
            ) &&

            Number.isFinite(
                bar.volume
            )

        );
}


// =====================================================
// GET MARKET DATA
// =====================================================

export async function getMarketData(
    ticker
) {

    validateApiKey();


    // =================================================
    // NORMALIZE INPUT
    // =================================================

    const input =
        String(ticker || "")
            .trim()
            .toUpperCase();


    if (!input) {

        throw new Error(
            "Ticker kosong"
        );
    }


    // =================================================
    // CARI SAHAM INDONESIA
    // =================================================

    const instrument =
        await searchIndonesiaStock(
            input
        );


    const resolvedSymbol =
        String(
            instrument.symbol || input
        );


    // =================================================
    // PASTIKAN BUKAN NON-INDONESIA
    // =================================================

    const instrumentCountry =
        String(
            instrument.country || ""
        ).toLowerCase();

    const instrumentExchange =
        String(
            instrument.exchange || ""
        ).toUpperCase();

    const instrumentMic =
        String(
            instrument.mic_code || ""
        ).toUpperCase();


    const isIndonesia =
        instrumentCountry === "indonesia" ||
        instrumentExchange === "IDX" ||
        instrumentExchange.includes(
            "INDONESIA"
        ) ||
        instrumentMic === "XIDX";


    if (!isIndonesia) {

        throw new Error(
            `${input} bukan instrumen Indonesia/XIDX`
        );
    }


    // =================================================
    // AMBIL CANDLE
    // =================================================

    const data =
        await getTimeSeries(
            resolvedSymbol
        );


    // =================================================
    // NORMALIZE
    // =================================================

    const bars =
        normalizeBars(
            data.values
        );


    if (bars.length === 0) {

        throw new Error(
            `OHLCV ${input} tidak valid`
        );
    }


    // =================================================
    // BUTUH DATA MINIMAL
    // =================================================

    if (bars.length < 30) {

        throw new Error(
            `${input} hanya memiliki ${bars.length} candle valid`
        );
    }


    // =================================================
    // CANDLE TERBARU
    // =================================================

    const latest =
        bars[0];


    const price =
        latest.close;


    // =================================================
    // CHANGE %
    // =================================================

    let changePercent = 0;


    if (
        bars.length >= 2 &&
        bars[1].close > 0
    ) {

        changePercent =
            (
                (
                    latest.close -
                    bars[1].close
                ) /
                bars[1].close
            ) *
            100;
    }


    // =================================================
    // META
    // =================================================

    const meta =
        data.meta || {};


    // =================================================
    // RETURN
    // =================================================

    return {

        ticker:
            resolvedSymbol,

        inputTicker:
            input,

        price,

        changePercent,

        bars,

        meta: {

            name:
                instrument.name ||
                meta.name ||
                null,

            symbol:
                resolvedSymbol,

            exchange:
                instrument.exchange ||
                meta.exchange ||
                "IDX",

            micCode:
                instrument.mic_code ||
                meta.mic_code ||
                "XIDX",

            country:
                instrument.country ||
                meta.country ||
                "Indonesia",

            currency:
                instrument.currency ||
                meta.currency ||
                "IDR",

            exchangeTimezone:
                meta.exchange_timezone ||
                "Asia/Jakarta",

            interval:
                meta.interval ||
                MARKET_SETTINGS.interval

        }

    };
}
