// =====================================================
// MONEY STYLE SCANNER
// api/market.js
// CLOUDFLARE WORKER → ZAPI IDX
// =====================================================


// =====================================================
// CLOUDFLARE WORKER
// =====================================================

const PROXY_URL =
    "https://money-style.bejop0433.workers.dev";


// =====================================================
// SETTINGS
// =====================================================

const SETTINGS = {

    path:
        "TradingSummary/GetStockSummary",

    length:
        1000,

    start:
        0,

    cacheDuration:
        30 * 1000

};


// =====================================================
// CACHE
// =====================================================

const marketCache =
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


    let text =
        String(value)
            .trim();


    // Hilangkan simbol persen
    text =
        text.replace(/%/g, "");


    // Jika format Indonesia:
    // 1.234,56
    //
    // ubah menjadi:
    // 1234.56

    if (
        text.includes(".") &&
        text.includes(",")
    ) {

        text =
            text
                .replace(/\./g, "")
                .replace(",", ".");

    }

    else if (
        text.includes(",")
    ) {

        // Kalau hanya koma,
        // coba anggap sebagai desimal

        text =
            text.replace(",", ".");

    }


    const number =
        Number(text);


    return number;

}


// =====================================================
// FIND FIELD
// =====================================================

function findField(
    row,
    names
) {

    if (!row) {
        return null;
    }


    for (
        const name of names
    ) {

        if (
            row[name] !== undefined &&
            row[name] !== null &&
            row[name] !== ""
        ) {

            return row[name];

        }

    }


    return null;

}


// =====================================================
// EXTRACT ROWS
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


    // Beberapa API membungkus
    // response dengan object lain

    if (
        Array.isArray(data?.items)
    ) {

        return data.items;

    }


    if (
        Array.isArray(data?.rows)
    ) {

        return data.rows;

    }


    return [];

}


// =====================================================
// FIND STOCK
// =====================================================

function findStock(
    rows,
    ticker
) {

    const target =
        normalizeTicker(ticker);


    // Cari exact match terlebih dahulu

    const exact =
        rows.find(row => {

            const code =
                normalizeTicker(

                    findField(
                        row,
                        [
                            "kodeEmiten",
                            "KodeEmiten",
                            "kode_emiten",
                            "stockCode",
                            "StockCode",
                            "stock_code",
                            "code",
                            "Code",
                            "symbol",
                            "Symbol",
                            "ticker",
                            "Ticker"
                        ]
                    )

                );


            return code === target;

        });


    if (exact) {

        return exact;

    }


    // Kalau endpoint sudah difilter
    // berdasarkan kodeEmiten,
    // gunakan row pertama.

    if (
        rows.length === 1
    ) {

        return rows[0];

    }


    return null;

}


// =====================================================
// REQUEST KE CLOUDFLARE WORKER
// =====================================================

async function apiRequest(
    ticker
) {

    const cleanTicker =
        normalizeTicker(ticker);


    if (!cleanTicker) {

        throw new Error(
            "Ticker kosong."
        );

    }


    // -----------------------------------------------
    // Query untuk Zapi
    // -----------------------------------------------

    const query =
        [
            `length=${SETTINGS.length}`,
            `start=${SETTINGS.start}`,
            `kodeEmiten=${encodeURIComponent(cleanTicker)}`
        ].join("&");


    // -----------------------------------------------
    // URL WORKER
    // -----------------------------------------------

    const params =
        new URLSearchParams({

            path:
                SETTINGS.path,

            query

        });


    const url =
        `${PROXY_URL}/?${params.toString()}`;


    console.log(
        `[MONEY STYLE] ${cleanTicker} → Worker`,
        url
    );


    // -----------------------------------------------
    // FETCH
    // -----------------------------------------------

    let response;


    try {

        response =
            await fetch(
                url,
                {

                    method:
                        "GET",

                    headers: {

                        "Accept":
                            "application/json"

                    }

                }
            );

    }

    catch (error) {

        throw new Error(
            `${cleanTicker}: gagal menghubungi Cloudflare Worker. ${error?.message || ""}`
        );

    }


    // -----------------------------------------------
    // RESPONSE TEXT
    // -----------------------------------------------

    const text =
        await response.text();


    let data;


    try {

        data =
            JSON.parse(text);

    }

    catch {

        throw new Error(

            `${cleanTicker}: Worker mengembalikan response bukan JSON. ` +
            `HTTP ${response.status}. ` +
            text.slice(0, 200)

        );

    }


    // -----------------------------------------------
    // HTTP ERROR
    // -----------------------------------------------

    if (
        !response.ok
    ) {

        throw new Error(

            data?.message ||
            data?.error ||
            `${cleanTicker}: Worker HTTP ${response.status}`

        );

    }


    // -----------------------------------------------
    // ZAPI ERROR
    // -----------------------------------------------

    if (
        data?.status === "error" ||
        data?.success === false ||
        data?.error
    ) {

        throw new Error(

            data?.message ||
            data?.error ||
            `${cleanTicker}: Zapi error`

        );

    }


    return data;

}


// =====================================================
// NORMALIZE BAR
// =====================================================

function normalizeBar(
    row
) {

    const open =
        toNumber(

            findField(
                row,
                [
                    "open",
                    "Open",
                    "openPrice",
                    "OpenPrice",
                    "open_price"
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
                    "HighPrice",
                    "high_price"
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
                    "LowPrice",
                    "low_price"
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
                    "closingPrice",
                    "ClosingPrice",
                    "last",
                    "Last",
                    "lastPrice",
                    "LastPrice",
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
                    "volumeValue",
                    "VolumeValue",
                    "totalVolume",
                    "TotalVolume",
                    "total_volume"
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


    const datetime =
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
        );


    return {

        datetime,

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

export async function getMarketData(
    ticker
) {

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
        marketCache.get(
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
        `[ZAPI VIA WORKER] ${cleanTicker}:`,
        response
    );


    // =================================================
    // ROWS
    // =================================================

    const rows =
        extractRows(
            response
        );


    if (
        rows.length === 0
    ) {

        throw new Error(

            `${cleanTicker}: response tidak memiliki data IDX.`

        );

    }


    // =================================================
    // STOCK
    // =================================================

    const stock =
        findStock(
            rows,
            cleanTicker
        );


    if (!stock) {

        throw new Error(

            `${cleanTicker}: saham tidak ditemukan dalam response Zapi.`

        );

    }


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
                    "lastPrice",
                    "LastPrice",
                    "price",
                    "Price",
                    "harga",
                    "Harga"
                ]
            )

        );


    // =================================================
    // CHANGE %
    // =================================================

    let changePercent =
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
                    "PersentasePerubahan",
                    "change_percentage"
                ]
            )

        );


    // =================================================
    // FALLBACK CHANGE %
    // =================================================

    if (
        !Number.isFinite(
            changePercent
        )
    ) {

        const change =
            toNumber(

                findField(
                    stock,
                    [
                        "change",
                        "Change",
                        "priceChange",
                        "PriceChange"
                    ]
                )

            );


        const previousClose =
            toNumber(

                findField(
                    stock,
                    [
                        "previousClose",
                        "PreviousClose",
                        "prevClose",
                        "PrevClose",
                        "previous_close"
                    ]
                )

            );


        if (
            Number.isFinite(change) &&
            Number.isFinite(previousClose) &&
            previousClose > 0
        ) {

            changePercent =
                (
                    change /
                    previousClose
                ) * 100;

        }

    }


    // =================================================
    // HISTORICAL BARS
    // =================================================

    const bars =
        rows
            .map(
                normalizeBar
            )
            .filter(
                Boolean
            );


    // =================================================
    // PRICE FALLBACK
    // =================================================

    let finalPrice =
        price;


    if (
        !Number.isFinite(
            finalPrice
        ) &&
        bars.length > 0
    ) {

        finalPrice =
            bars[0].close;

    }


    // =================================================
    // PRICE VALIDATION
    // =================================================

    if (
        !Number.isFinite(
            finalPrice
        )
    ) {

        throw new Error(

            `${cleanTicker}: harga saham tidak tersedia.`

        );

    }


    // =================================================
    // IMPORTANT
    // =================================================
    //
    // Profile engine membutuhkan
    // OHLCV historical.
    //
    // Jangan membuat candle dummy.
    //
    // =================================================

    if (
        bars.length === 0
    ) {

        throw new Error(

            `${cleanTicker}: endpoint Zapi tidak memberikan OHLCV historical. ` +
            `Data historical diperlukan untuk POC dan Volume Profile.`

        );

    }


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

            micCode:
                "XIDX",

            currency:
                "IDR",

            timezone:
                "Asia/Jakarta",

            source:
                "Zapi IDX via Cloudflare Worker",

            endpoint:
                SETTINGS.path,

            proxy:
                PROXY_URL,

            live:
                true

        },

        raw:
            response

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
