// =====================================================
// MONEY STYLE SCANNER
// api/market.js
// ZAPI - IDX STOCK MARKET
// =====================================================

const API_KEY = "zpi_adggofa2ciw6f9uakw5nxifogu";

const BASE_URL = "https://zpi.web.id/api/finance/idx";


// =====================================================
// SETTINGS
// =====================================================

const MARKET_SETTINGS = {

    // Endpoint IDX Zapi
    endpoint: "/stock-summary",

    // Jumlah data yang diminta
    length: 1000,

    // Cache 30 detik
    cacheDuration: 30 * 1000
};


// =====================================================
// CACHE
// =====================================================

const marketCache = new Map();


// =====================================================
// NORMALIZE TICKER
// =====================================================

function normalizeTicker(ticker) {

    return String(ticker || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");

}


// =====================================================
// API REQUEST
// =====================================================

async function apiRequest(params = {}) {

    if (
        !API_KEY ||
        API_KEY === "MASUKKAN_API_KEY_ZAPI_DI_SINI"
    ) {

        throw new Error(
            "API key Zapi belum diisi."
        );

    }


    const searchParams =
        new URLSearchParams({

            ...params,

            length:
                String(
                    params.length ??
                    MARKET_SETTINGS.length
                )

        });


    const url =
        `${BASE_URL}${MARKET_SETTINGS.endpoint}?${searchParams.toString()}`;


    const response =
        await fetch(url, {

            method: "GET",

            headers: {

                "Authorization":
                    `Bearer ${API_KEY}`,

                "Accept":
                    "application/json"

            }

        });


    let data = null;


    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            `Response Zapi tidak valid. HTTP ${response.status}`
        );

    }


    if (!response.ok) {

        throw new Error(

            data?.message ||

            data?.error ||

            `Zapi HTTP ${response.status}`

        );

    }


    return data;

}


// =====================================================
// EXTRACT ARRAY
// =====================================================
//
// Karena struktur response API bisa berubah,
// kita coba beberapa bentuk umum.
//
// =====================================================

function extractRows(data) {

    if (Array.isArray(data)) {

        return data;

    }


    if (
        Array.isArray(data?.data)
    ) {

        return data.data;

    }


    if (
        Array.isArray(data?.data?.data)
    ) {

        return data.data.data;

    }


    if (
        Array.isArray(data?.result)
    ) {

        return data.result;

    }


    if (
        Array.isArray(data?.results)
    ) {

        return data.results;

    }


    return [];

}


// =====================================================
// FIND FIELD
// =====================================================

function findField(row, names) {

    for (const name of names) {

        if (
            row &&
            row[name] !== undefined &&
            row[name] !== null
        ) {

            return row[name];

        }

    }


    return null;

}


// =====================================================
// NUMBER
// =====================================================

function toNumber(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return NaN;

    }


    if (
        typeof value === "number"
    ) {

        return value;

    }


    const cleaned =
        String(value)
            .replace(/,/g, "")
            .replace(/%/g, "")
            .trim();


    const number =
        Number(cleaned);


    return number;

}


// =====================================================
// FIND STOCK
// =====================================================

function findStock(rows, ticker) {

    const target =
        normalizeTicker(ticker);


    return rows.find(row => {

        const code =
            normalizeTicker(

                findField(
                    row,
                    [
                        "StockCode",
                        "stockCode",
                        "stock_code",
                        "code",
                        "Code",
                        "symbol",
                        "Symbol"
                    ]
                )

            );


        return code === target;

    });

}


// =====================================================
// GET MARKET DATA
// =====================================================
//
// PERHATIAN:
//
// Endpoint stock-summary adalah data ringkasan,
// bukan 150 candle historical.
//
// Fungsi ini mengembalikan data dalam bentuk
// yang bisa digunakan app.js.
//
// =====================================================

export async function getMarketData(ticker) {

    const cleanTicker =
        normalizeTicker(ticker);


    if (!cleanTicker) {

        throw new Error(
            "Ticker kosong."
        );

    }


    // =================================================
    // CACHE
    // =================================================

    const cached =
        marketCache.get(cleanTicker);


    if (
        cached &&
        Date.now() - cached.time <
            MARKET_SETTINGS.cacheDuration
    ) {

        return cached.data;

    }


    // =================================================
    // REQUEST DATA IDX
    // =================================================

    const response =
        await apiRequest({

            code:
                cleanTicker

        });


    const rows =
        extractRows(response);


    if (
        !Array.isArray(rows) ||
        rows.length === 0
    ) {

        throw new Error(

            `${cleanTicker}: data IDX tidak ditemukan.`

        );

    }


    // =================================================
    // CARI TICKER
    // =================================================

    const stock =
        findStock(
            rows,
            cleanTicker
        );


    if (!stock) {

        throw new Error(

            `${cleanTicker}: saham tidak ditemukan di data IDX Zapi.`

        );

    }


    // =================================================
    // FIELD MARKET
    // =================================================

    const price =
        toNumber(

            findField(
                stock,
                [
                    "Close",
                    "close",
                    "Last",
                    "last",
                    "Price",
                    "price",
                    "LastPrice",
                    "lastPrice"
                ]
            )

        );


    const changePercent =
        toNumber(

            findField(
                stock,
                [
                    "ChangePercent",
                    "changePercent",
                    "ChangePct",
                    "changePct",
                    "PercentChange",
                    "percentChange"
                ]
            )

        );


    // =================================================
    // VALIDASI PRICE
    // =================================================

    if (
        !Number.isFinite(price)
    ) {

        throw new Error(

            `${cleanTicker}: harga saham tidak tersedia dari response Zapi.`

        );

    }


    // =================================================
    // RETURN
    // =================================================

    const result = {

        ticker:
            cleanTicker,

        price,

        changePercent:
            Number.isFinite(changePercent)
                ? changePercent
                : 0,

        // ---------------------------------------------
        // BELUM ADA HISTORICAL CANDLE
        // ---------------------------------------------
        //
        // Jangan isi dummy.
        //
        // Karena engine profile membutuhkan
        // OHLCV historical.
        //
        bars: [],

        meta: {

            symbol:
                cleanTicker,

            exchange:
                "Indonesia Stock Exchange",

            currency:
                "IDR",

            source:
                "Zapi IDX",

            live:
                true

        },

        raw:
            stock

    };


    // =================================================
    // CACHE
    // =================================================

    marketCache.set(

        cleanTicker,

        {

            time:
                Date.now(),

            data:
                result

        }

    );


    return result;

}


// =====================================================
// CLEAR CACHE
// =====================================================

export function clearMarketCache() {

    marketCache.clear();

}
