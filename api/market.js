// =====================================================
// MONEY STYLE SCANNER
// api/market.js
// =====================================================

const API_KEY = "53c7109a9a114a65847c1f15afa69db1";

const BASE_URL = "https://api.twelvedata.com";


// =====================================================
// SETTINGS
// =====================================================

const MARKET_SETTINGS = {
    exchange: "XIDX",
    interval: "1day",
    outputsize: 180
};


// =====================================================
// NORMALIZE TICKER
// =====================================================

function normalizeTicker(ticker) {

    if (!ticker) {
        throw new Error("Ticker kosong");
    }

    return String(ticker)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
}


// =====================================================
// CHECK API KEY
// =====================================================

function checkApiKey() {

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
// FETCH JSON
// =====================================================

async function fetchJSON(url) {

    const response =
        await fetch(url);

    let data;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            `Response API tidak valid (HTTP ${response.status})`
        );
    }


    if (!response.ok) {

        throw new Error(
            data?.message ||
            `HTTP ${response.status}`
        );
    }


    return data;
}


// =====================================================
// CARI SYMBOL XIDX
// =====================================================
//
// Input:
// BBNI
//
// Akan dicari melalui symbol_search.
// Kita prioritaskan:
// exchange XIDX
// dan symbol yang benar-benar cocok.
//
// =====================================================

async function findIndonesiaSymbol(ticker) {

    const params =
        new URLSearchParams({

            symbol:
                ticker,

            exchange:
                MARKET_SETTINGS.exchange,

            apikey:
                API_KEY

        });


    const url =
        `${BASE_URL}/symbol_search?${params.toString()}`;


    const data =
        await fetchJSON(url);


    // -------------------------------------------------
    // ERROR DARI TWELVE DATA
    // -------------------------------------------------

    if (
        data?.status === "error" ||
        data?.code
    ) {

        throw new Error(
            data?.message ||
            "Symbol search gagal"
        );
    }


    // -------------------------------------------------
    // HASIL SEARCH
    // -------------------------------------------------

    const results =
        Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
                ? data.data
                : Array.isArray(data?.values)
                    ? data.values
                    : [];


    if (results.length === 0) {

        throw new Error(
            `Ticker ${ticker} tidak ditemukan di XIDX`
        );
    }


    // -------------------------------------------------
    // PRIORITAS HASIL
    // -------------------------------------------------

    const candidates =
        results.filter(item => {

            const exchange =
                String(
                    item.exchange ||
                    ""
                ).toUpperCase();

            const mic =
                String(
                    item.mic_code ||
                    item.mic ||
                    ""
                ).toUpperCase();

            const symbol =
                String(
                    item.symbol ||
                    ""
                ).toUpperCase();

            return (

                exchange.includes("INDONESIA") ||

                exchange.includes(
                    "INDONESIA STOCK EXCHANGE"
                ) ||

                mic === "XIDX" ||

                symbol === ticker

            );

        });


    const pool =
        candidates.length > 0
            ? candidates
            : results;


    // -------------------------------------------------
    // CARI SYMBOL YANG PALING COCOK
    // -------------------------------------------------

    const exact =
        pool.find(item => {

            const symbol =
                String(
                    item.symbol ||
                    ""
                ).toUpperCase();

            return symbol === ticker;

        });


    const selected =
        exact ||
        pool[0];


    const symbol =
        String(
            selected.symbol ||
            ticker
        ).trim();


    if (!symbol) {

        throw new Error(
            `Symbol valid untuk ${ticker} tidak ditemukan`
        );
    }


    return {

        symbol,

        name:
            selected.name ||
            ticker,

        exchange:
            selected.exchange ||
            "Indonesia Stock Exchange",

        micCode:
            selected.mic_code ||
            selected.mic ||
            "XIDX",

        currency:
            selected.currency ||
            "IDR",

        type:
            selected.type ||
            "Common Stock"

    };
}


// =====================================================
// TIME SERIES
// =====================================================

async function getTimeSeries(symbol) {

    const params =
        new URLSearchParams({

            symbol,

            exchange:
                MARKET_SETTINGS.exchange,

            interval:
                MARKET_SETTINGS.interval,

            outputsize:
                String(
                    MARKET_SETTINGS.outputsize
                ),

            order:
                "desc",

            apikey:
                API_KEY

        });


    const url =
        `${BASE_URL}/time_series?${params.toString()}`;


    const data =
        await fetchJSON(url);


    if (
        data?.status === "error" ||
        data?.code
    ) {

        throw new Error(
            data?.message ||
            "Time series error"
        );
    }


    if (
        !Array.isArray(data?.values) ||
        data.values.length === 0
    ) {

        throw new Error(
            `Tidak ada historical data untuk ${symbol}`
        );
    }


    return data;
}


// =====================================================
// NORMALIZE OHLCV
// =====================================================

function normalizeBars(
    values,
    ticker
) {

    const bars =
        values
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


    if (bars.length === 0) {

        throw new Error(
            `OHLCV ${ticker} tidak valid`
        );
    }


    return bars;
}


// =====================================================
// GET MARKET DATA
// =====================================================

export async function getMarketData(
    ticker
) {

    checkApiKey();


    const inputTicker =
        normalizeTicker(ticker);


    // =================================================
    // STEP 1
    // SYMBOL SEARCH
    // =================================================

    let instrument;

    try {

        instrument =
            await findIndonesiaSymbol(
                inputTicker
            );

    } catch (error) {

        throw new Error(
            `${inputTicker}: ${error.message}`
        );
    }


    // =================================================
    // STEP 2
    // TIME SERIES
    // =================================================

    let data;

    try {

        data =
            await getTimeSeries(
                instrument.symbol
            );

    } catch (error) {

        throw new Error(
            `${inputTicker}: ${error.message}`
        );
    }


    // =================================================
    // STEP 3
    // NORMALIZE
    // =================================================

    const bars =
        normalizeBars(
            data.values,
            inputTicker
        );


    // =================================================
    // CURRENT PRICE
    // =================================================

    const latest =
        bars[0];


    if (!latest) {

        throw new Error(
            `${inputTicker}: candle terbaru tidak tersedia`
        );
    }


    const price =
        latest.close;


    // =================================================
    // CHANGE %
    // =================================================

    let changePercent = 0;


    if (
        bars.length >= 2 &&
        Number.isFinite(
            bars[1].close
        ) &&
        bars[1].close !== 0
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

        // ticker yang user masukkan
        ticker:
            inputTicker,

        // ticker resmi Twelve Data
        symbol:
            meta.symbol ||
            instrument.symbol,

        price,

        changePercent,

        bars,

        meta: {

            name:
                instrument.name ||
                inputTicker,

            exchange:
                meta.exchange ||
                instrument.exchange ||
                "Indonesia Stock Exchange",

            micCode:
                meta.mic_code ||
                instrument.micCode ||
                "XIDX",

            exchangeTimezone:
                meta.exchange_timezone ||
                "Asia/Jakarta",

            currency:
                meta.currency ||
                instrument.currency ||
                "IDR",

            type:
                meta.type ||
                instrument.type ||
                "Common Stock",

            interval:
                meta.interval ||
                MARKET_SETTINGS.interval

        }

    };
}
