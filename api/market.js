// =====================================================
// MONEY STYLE SCANNER
// api/market.js
// =====================================================

const API_KEY = "53c7109a9a114a65847c1f15afa69db1";

const BASE_URL = "https://api.twelvedata.com";


// =====================================================
// MARKET SETTINGS
// =====================================================

const MARKET_SETTINGS = {
    interval: "1day",
    outputsize: 180,
    exchange: "XIDX"
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
// BUILD URL
// =====================================================

function buildTimeSeriesURL(ticker) {

    const params = new URLSearchParams({

        symbol: ticker,

        exchange:
            MARKET_SETTINGS.exchange,

        interval:
            MARKET_SETTINGS.interval,

        outputsize:
            String(
                MARKET_SETTINGS.outputsize
            ),

        apikey:
            API_KEY

    });

    return `${BASE_URL}/time_series?${params.toString()}`;
}


// =====================================================
// REQUEST DATA
// =====================================================

async function requestTimeSeries(ticker) {

    const url =
        buildTimeSeriesURL(ticker);

    const response =
        await fetch(url);

    let data = null;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            `Response API tidak valid (${response.status})`
        );
    }


    // HTTP ERROR
    if (!response.ok) {

        throw new Error(
            data?.message ||
            `HTTP ${response.status}`
        );
    }


    // TWELVE DATA ERROR
    if (
        data?.status === "error" ||
        data?.code
    ) {

        throw new Error(
            data?.message ||
            `Twelve Data error (${data?.code || "unknown"})`
        );
    }


    if (
        !Array.isArray(data?.values) ||
        data.values.length === 0
    ) {

        throw new Error(
            `Data ${ticker} tidak tersedia di XIDX`
        );
    }


    return data;
}


// =====================================================
// NORMALIZE BARS
// =====================================================

function normalizeBars(values, ticker) {

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

export async function getMarketData(ticker) {

    const symbol =
        normalizeTicker(ticker);


    // -------------------------------------------------
    // API KEY
    // -------------------------------------------------

    if (
        !API_KEY ||
        API_KEY ===
            "ISI_API_KEY_TWELVE_DATA_DI_SINI"
    ) {

        throw new Error(
            "API key Twelve Data belum diisi"
        );
    }


    // -------------------------------------------------
    // REQUEST INDONESIA / XIDX
    // -------------------------------------------------

    let data;

    try {

        data =
            await requestTimeSeries(
                symbol
            );

    } catch (error) {

        console.error(
            `Twelve Data ${symbol}:`,
            error
        );

        throw new Error(
            `${symbol}: ${error.message}`
        );
    }


    // -------------------------------------------------
    // NORMALIZE
    // -------------------------------------------------

    const bars =
        normalizeBars(
            data.values,
            symbol
        );


    // -------------------------------------------------
    // LATEST
    // -------------------------------------------------

    const latest =
        bars[0];


    const previous =
        bars.length >= 2
            ? bars[1]
            : null;


    const price =
        latest.close;


    // -------------------------------------------------
    // CHANGE %
    // -------------------------------------------------

    let changePercent = 0;

    if (
        previous &&
        Number.isFinite(
            previous.close
        ) &&
        previous.close !== 0
    ) {

        changePercent =
            (
                (
                    latest.close -
                    previous.close
                ) /
                previous.close
            ) *
            100;
    }


    // -------------------------------------------------
    // META
    // -------------------------------------------------

    const meta =
        data.meta || {};


    // -------------------------------------------------
    // VALIDASI EXCHANGE
    // -------------------------------------------------

    const exchange =
        meta.exchange ||
        MARKET_SETTINGS.exchange;


    const currency =
        meta.currency ||
        "IDR";


    // -------------------------------------------------
    // RETURN
    // -------------------------------------------------

    return {

        ticker:
            meta.symbol ||
            symbol,

        price,

        changePercent,

        bars,

        meta: {

            exchange,

            micCode:
                meta.mic_code ||
                "XIDX",

            exchangeTimezone:
                meta.exchange_timezone ||
                "Asia/Jakarta",

            currency,

            interval:
                meta.interval ||
                MARKET_SETTINGS.interval,

            type:
                meta.type ||
                "Common Stock"

        }

    };
}
