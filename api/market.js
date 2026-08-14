// =====================================================
// MONEY STYLE SCANNER
// api/market.js
// YAHOO FINANCE - INDONESIA / IDX
// =====================================================

const BASE_URL =
    "https://query1.finance.yahoo.com/v8/finance/chart";


// =====================================================
// SETTINGS
// =====================================================

const MARKET_SETTINGS = {
    interval: "1d",
    range: "1y"
};


// =====================================================
// NORMALIZE TICKER
// =====================================================

function normalizeTicker(ticker) {

    return String(ticker || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace(".JK", "");
}


// =====================================================
// YAHOO SYMBOL
// =====================================================

function toYahooSymbol(ticker) {

    const clean =
        normalizeTicker(ticker);

    if (!clean) {
        throw new Error("Ticker kosong");
    }

    return `${clean}.JK`;
}


// =====================================================
// NORMALIZE BAR
// =====================================================

function normalizeBar(
    timestamp,
    quote,
    index
) {

    const open =
        Number(quote.open?.[index]);

    const high =
        Number(quote.high?.[index]);

    const low =
        Number(quote.low?.[index]);

    const close =
        Number(quote.close?.[index]);

    const volume =
        Number(quote.volume?.[index]);


    if (
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close) ||
        !Number.isFinite(volume)
    ) {
        return null;
    }


    const date =
        new Date(
            timestamp * 1000
        );


    return {

        datetime:
            date.toISOString(),

        open,
        high,
        low,
        close,
        volume
    };
}


// =====================================================
// GET MARKET DATA
// =====================================================

export async function getMarketData(ticker) {

    const cleanTicker =
        normalizeTicker(ticker);


    if (!cleanTicker) {

        throw new Error(
            "Ticker kosong"
        );
    }


    const yahooSymbol =
        toYahooSymbol(
            cleanTicker
        );


    // =================================================
    // URL
    // =================================================

    const params =
        new URLSearchParams({

            interval:
                MARKET_SETTINGS.interval,

            range:
                MARKET_SETTINGS.range,

            events:
                "history",

            includeAdjustedClose:
                "true"

        });


    const url =
        `${BASE_URL}/${encodeURIComponent(
            yahooSymbol
        )}?${params.toString()}`;


    // =================================================
    // REQUEST
    // =================================================

    let response;

    try {

        response =
            await fetch(url);

    } catch (error) {

        throw new Error(
            `${cleanTicker}: Yahoo Finance tidak dapat diakses dari browser. Kemungkinan CORS.`
        );
    }


    // =================================================
    // RESPONSE
    // =================================================

    let data;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            `${cleanTicker}: response Yahoo tidak valid`
        );
    }


    if (!response.ok) {

        throw new Error(
            `${cleanTicker}: HTTP ${response.status}`
        );
    }


    // =================================================
    // YAHOO ERROR
    // =================================================

    const yahooError =
        data?.chart?.error;


    if (yahooError) {

        throw new Error(
            `${cleanTicker}: ${
                yahooError.description ||
                "Yahoo Finance error"
            }`
        );
    }


    // =================================================
    // RESULT
    // =================================================

    const result =
        data?.chart?.result?.[0];


    if (!result) {

        throw new Error(
            `${cleanTicker}: data Yahoo tidak ditemukan`
        );
    }


    const timestamps =
        result.timestamp;


    const quote =
        result.indicators?.quote?.[0];


    if (
        !Array.isArray(timestamps) ||
        !quote
    ) {

        throw new Error(
            `${cleanTicker}: OHLCV Yahoo tidak tersedia`
        );
    }


    // =================================================
    // NORMALIZE OHLCV
    // =================================================

    const bars = [];


    for (
        let i = 0;
        i < timestamps.length;
        i++
    ) {

        const bar =
            normalizeBar(
                timestamps[i],
                quote,
                i
            );


        if (bar) {

            bars.push(bar);
        }
    }


    // =================================================
    // SORT
    // =================================================
    //
    // Engine kamu menggunakan:
    //
    // bars[0] = candle terbaru
    //
    // =================================================

    bars.sort(
        (a, b) =>
            new Date(b.datetime) -
            new Date(a.datetime)
    );


    // =================================================
    // VALIDASI
    // =================================================

    if (bars.length === 0) {

        throw new Error(
            `${cleanTicker}: tidak ada candle OHLCV`
        );
    }


    // =================================================
    // CURRENT PRICE
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
            ) * 100;
    }


    // =================================================
    // META
    // =================================================

    const meta =
        result.meta || {};


    // =================================================
    // RETURN
    // =================================================

    return {

        ticker:
            cleanTicker,

        resolvedSymbol:
            yahooSymbol,

        price,

        changePercent,

        bars,

        meta: {

            symbol:
                yahooSymbol,

            exchange:
                meta.exchangeName ||
                "Indonesia Stock Exchange",

            micCode:
                "XIDX",

            exchangeTimezone:
                meta.exchangeTimezoneName ||
                "Asia/Jakarta",

            currency:
                meta.currency ||
                "IDR",

            interval:
                MARKET_SETTINGS.interval,

            type:
                meta.instrumentType ||
                "EQUITY"
        }

    };
}
