// =====================================================
// MONEY STYLE SCANNER
// api/market.js
// INDONESIA STOCKS / XIDX
// =====================================================

const API_KEY = "53c7109a9a114a65847c1f15afa69db1";

const BASE_URL = "https://api.twelvedata.com";

const SETTINGS = {
    exchange: "XIDX",
    country: "Indonesia",
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

function checkAPIKey() {

    if (
        !API_KEY ||
        API_KEY === "ISI_API_KEY_TWELVE_DATA_DI_SINI"
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
            `Response API tidak valid. HTTP ${response.status}`
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
// FIND STOCK VIA /STOCKS
// =====================================================
//
// Ini sengaja memakai /stocks,
// bukan menebak symbol.
//
// Twelve Data mendokumentasikan /stocks sebagai
// daftar seluruh ticker saham yang tersedia.
// Filter bisa menggunakan symbol/exchange/country.
//
// =====================================================

async function findIndonesiaStock(ticker) {

    const params =
        new URLSearchParams({

            symbol:
                ticker,

            exchange:
                SETTINGS.exchange,

            country:
                SETTINGS.country,

            apikey:
                API_KEY

        });


    const url =
        `${BASE_URL}/stocks?${params.toString()}`;


    const data =
        await fetchJSON(url);


    // -------------------------------------------------
    // ERROR
    // -------------------------------------------------

    if (
        data?.status === "error" ||
        data?.code
    ) {

        throw new Error(
            data?.message ||
            "Gagal mencari daftar saham"
        );
    }


    // -------------------------------------------------
    // RESPONSE /stocks
    // -------------------------------------------------

    const stocks =
        Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
                ? data.data
                : [];


    if (stocks.length === 0) {

        throw new Error(
            `${ticker} tidak tersedia di Twelve Data untuk XIDX`
        );
    }


    // -------------------------------------------------
    // CARI EXACT MATCH
    // -------------------------------------------------

    const exact =
        stocks.find(stock => {

            const symbol =
                String(
                    stock.symbol || ""
                )
                .trim()
                .toUpperCase();

            return symbol === ticker;

        });


    if (!exact) {

        throw new Error(
            `${ticker} tidak ditemukan sebagai ticker XIDX yang valid`
        );
    }


    return exact;
}


// =====================================================
// GET TIME SERIES
// =====================================================

async function getTimeSeries(
    symbol
) {

    const params =
        new URLSearchParams({

            symbol:
                symbol,

            exchange:
                SETTINGS.exchange,

            interval:
                SETTINGS.interval,

            outputsize:
                String(
                    SETTINGS.outputsize
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


    // -------------------------------------------------
    // API ERROR
    // -------------------------------------------------

    if (
        data?.status === "error" ||
        data?.code
    ) {

        throw new Error(
            data?.message ||
            "Time series error"
        );
    }


    // -------------------------------------------------
    // NO DATA
    // -------------------------------------------------

    if (
        !Array.isArray(data?.values) ||
        data.values.length === 0
    ) {

        throw new Error(
            `Tidak ada data candle untuk ${symbol}`
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
            `Data OHLCV ${ticker} tidak valid`
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

    checkAPIKey();


    const inputTicker =
        normalizeTicker(ticker);


    // =================================================
    // STEP 1
    // VALIDASI TICKER XIDX
    // =================================================

    let stock;

    try {

        stock =
            await findIndonesiaStock(
                inputTicker
            );

    } catch (error) {

        throw new Error(
            `${inputTicker}: ${error.message}`
        );
    }


    // =================================================
    // SYMBOL RESMI
    // =================================================

    const officialSymbol =
        String(
            stock.symbol
        ).trim();


    if (!officialSymbol) {

        throw new Error(
            `${inputTicker}: symbol resmi tidak ditemukan`
        );
    }


    // =================================================
    // STEP 2
    // AMBIL HISTORICAL DATA
    // =================================================

    let data;

    try {

        data =
            await getTimeSeries(
                officialSymbol
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
    // CANDLE TERBARU
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
            ) * 100;
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

        // ticker input
        ticker:
            inputTicker,

        // ticker resmi API
        symbol:
            meta.symbol ||
            officialSymbol,

        price,

        changePercent,

        bars,

        meta: {

            name:
                stock.name ||
                meta.name ||
                inputTicker,

            exchange:
                meta.exchange ||
                stock.exchange ||
                "Indonesia Stock Exchange",

            micCode:
                meta.mic_code ||
                stock.mic_code ||
                "XIDX",

            country:
                stock.country ||
                "Indonesia",

            currency:
                meta.currency ||
                stock.currency ||
                "IDR",

            type:
                meta.type ||
                stock.type ||
                "Common Stock",

            exchangeTimezone:
                meta.exchange_timezone ||
                "Asia/Jakarta",

            interval:
                meta.interval ||
                SETTINGS.interval

        }

    };
}
