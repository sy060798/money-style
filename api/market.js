// =====================================================
// MONEY STYLE SCANNER
// api/market.js
// ZAPI IDX VIA PROXY
// =====================================================


// =====================================================
// PROXY URL
// =====================================================
//
// NANTI ISI DENGAN URL BACKEND / CLOUDFLARE WORKER
//
// Contoh:
// https://money-style-api.namauser.workers.dev
//
// JANGAN lagi masukkan API KEY ZAPI di sini.
// =====================================================

const PROXY_URL =
    "https://zpi.web.id";


// =====================================================
// SETTINGS
// =====================================================

const SETTINGS = {

    // Endpoint yang dipanggil oleh proxy
    path:
        "TradingSummary/GetStockSummary",

    // Jumlah data
    length:
        1000,

    start:
        0,

    // Cache browser
    cacheDuration:
        30 * 1000
};


// =====================================================
// CACHE
// =====================================================

const cache =
    new Map();


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
// NUMBER
// =====================================================

function toNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return NaN;
    }


    if (
        typeof value === "number"
    ) {
        return value;
    }


    const text =
        String(value)
            .replace(/\./g, "")
            .replace(/,/g, ".")
            .replace(/%/g, "")
            .trim();


    return Number(text);

}


// =====================================================
// EXTRACT ARRAY
// =====================================================

function extractRows(data) {

    if (
        Array.isArray(data)
    ) {
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

    if (!row) {
        return null;
    }


    for (
        const name of names
    ) {

        if (
            row[name] !== undefined &&
            row[name] !== null
        ) {

            return row[name];

        }

    }


    return null;

}


// =====================================================
// PROXY REQUEST
// =====================================================

async function apiRequest(ticker) {

    if (
        !PROXY_URL ||
        PROXY_URL.includes(
            "GANTI-DENGAN"
        )
    ) {

        throw new Error(
            "PROXY_URL belum diisi. Buat proxy Cloudflare Worker terlebih dahulu."
        );

    }


    const params =
        new URLSearchParams({

            code:
                ticker,

            path:
                SETTINGS.path,

            length:
                String(
                    SETTINGS.length
                ),

            start:
                String(
                    SETTINGS.start
                )

        });


    const url =
        `${PROXY_URL}/stock?${params.toString()}`;


    const response =
        await fetch(
            url,
            {
                method: "GET",

                headers: {
                    "Accept":
                        "application/json"
                }
            }
        );


    let data;


    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            `Proxy tidak mengembalikan JSON. HTTP ${response.status}`
        );

    }


    if (
        !response.ok
    ) {

        throw new Error(

            data?.message ||
            data?.error ||
            `Proxy HTTP ${response.status}`

        );

    }


    if (
        data?.error
    ) {

        throw new Error(
            data.error
        );

    }


    return data;

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


    // =================================================
    // CACHE
    // =================================================

    const cached =
        cache.get(
            cleanTicker
        );


    if (
        cached &&
        Date.now() -
            cached.time <
            SETTINGS.cacheDuration
    ) {

        return cached.data;

    }


    // =================================================
    // REQUEST
    // =================================================

    const response =
        await apiRequest(
            cleanTicker
        );


    console.log(
        `[ZAPI PROXY] ${cleanTicker}:`,
        response
    );


    // =================================================
    // EXTRACT DATA
    // =================================================

    const rows =
        extractRows(
            response
        );


    if (
        rows.length === 0
    ) {

        throw new Error(

            `${cleanTicker}: data IDX tidak ditemukan dari proxy.`

        );

    }


    // =================================================
    // CARI STOCK
    // =================================================

    const stock =
        rows.find(
            row => {

                const code =
                    normalizeTicker(

                        findField(
                            row,
                            [
                                "kodeEmiten",
                                "KodeEmiten",
                                "stockCode",
                                "StockCode",
                                "code",
                                "Code",
                                "symbol",
                                "Symbol"
                            ]
                        )

                    );


                return (
                    code ===
                    cleanTicker
                );

            }
        ) ||
        rows[0];


    // =================================================
    // PRICE
    // =================================================

    const price =
        toNumber(

            findField(
                stock,
                [
                    "close",
                    "Close",
                    "last",
                    "Last",
                    "price",
                    "Price",
                    "lastPrice",
                    "LastPrice",
                    "harga",
                    "Harga",
                    "closePrice",
                    "ClosePrice"
                ]
            )

        );


    // =================================================
    // CHANGE %
    // =================================================

    const changePercent =
        toNumber(

            findField(
                stock,
                [
                    "changePercent",
                    "ChangePercent",
                    "changePct",
                    "ChangePct",
                    "percentChange",
                    "PercentChange",
                    "persentasePerubahan",
                    "PersentasePerubahan"
                ]
            )

        );


    // =================================================
    // HISTORICAL OHLCV
    // =================================================

    const bars =
        rows
            .map(
                row => {

                    const open =
                        toNumber(

                            findField(
                                row,
                                [
                                    "open",
                                    "Open",
                                    "openPrice",
                                    "OpenPrice"
                                ]
                            )

                        );


                    const high =
                        toNumber(

                            findField(
                                row,
                                [
                                    "high",
                                    "High",
                                    "highPrice",
                                    "HighPrice"
                                ]
                            )

                        );


                    const low =
                        toNumber(

                            findField(
                                row,
                                [
                                    "low",
                                    "Low",
                                    "lowPrice",
                                    "LowPrice"
                                ]
                            )

                        );


                    const close =
                        toNumber(

                            findField(
                                row,
                                [
                                    "close",
                                    "Close",
                                    "last",
                                    "Last",
                                    "price",
                                    "Price"
                                ]
                            )

                        );


                    const volume =
                        toNumber(

                            findField(
                                row,
                                [
                                    "volume",
                                    "Volume",
                                    "totalVolume",
                                    "TotalVolume",
                                    "volumeValue",
                                    "VolumeValue"
                                ]
                            )

                        );


                    if (
                        !Number.isFinite(open) ||
                        !Number.isFinite(high) ||
                        !Number.isFinite(low) ||
                        !Number.isFinite(close) ||
                        !Number.isFinite(volume)
                    ) {

                        return null;

                    }


                    return {

                        datetime:
                            findField(
                                row,
                                [
                                    "datetime",
                                    "date",
                                    "Date",
                                    "tanggal",
                                    "Tanggal",
                                    "tradingDate",
                                    "TradingDate"
                                ]
                            ),

                        open,
                        high,
                        low,
                        close,
                        volume

                    };

                }
            )
            .filter(Boolean);


    // =================================================
    // PRICE FALLBACK
    // =================================================

    const finalPrice =
        Number.isFinite(price)
            ? price
            : bars.length > 0
                ? bars[0].close
                : NaN;


    if (
        !Number.isFinite(
            finalPrice
        )
    ) {

        throw new Error(

            `${cleanTicker}: harga saham tidak ditemukan.`

        );

    }


    // =================================================
    // HISTORICAL VALIDATION
    // =================================================

    if (
        bars.length === 0
    ) {

        throw new Error(

            `${cleanTicker}: endpoint Zapi ini tidak memberikan OHLCV historical. Profile/POC membutuhkan data candle historical.`

        );

    }


    // =================================================
    // URUTKAN CANDLE
    // =================================================
    //
    // Engine kita membutuhkan:
    //
    // bars[0] = candle terbaru
    //
    // =================================================

    bars.sort(
        (a, b) => {

            const dateA =
                new Date(
                    a.datetime
                ).getTime();

            const dateB =
                new Date(
                    b.datetime
                ).getTime();


            if (
                !Number.isFinite(
                    dateA
                ) ||
                !Number.isFinite(
                    dateB
                )
            ) {

                return 0;

            }


            return dateB - dateA;

        }
    );


    // =================================================
    // RESULT
    // =================================================

    const result = {

        ticker:
            cleanTicker,

        price:
            finalPrice,

        changePercent:
            Number.isFinite(
                changePercent
            )
                ? changePercent
                : 0,

        bars,

        meta: {

            symbol:
                cleanTicker,

            exchange:
                "Indonesia Stock Exchange",

            currency:
                "IDR",

            source:
                "Zapi IDX via Proxy",

            endpoint:
                SETTINGS.path,

            live:
                true,

            candleCount:
                bars.length

        },

        raw:
            response

    };


    // =================================================
    // CACHE
    // =================================================

    cache.set(

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

    cache.clear();

}
