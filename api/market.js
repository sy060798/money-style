// =====================================================
// MONEY STYLE SCANNER
// api/market.js
// CLOUDFLARE WORKER → ZAPI IDX STOCK HISTORY
// =====================================================

const PROXY_URL =
    "https://money-style.bejop0433.workers.dev";


// =====================================================
// SETTINGS
// =====================================================

const SETTINGS = {

    // Jumlah candle historical
    length: 150,

    // Cache browser
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


    const text =
        String(value)
            .trim()
            .replace(/,/g, "");


    const number =
        Number(text);


    return number;

}


// =====================================================
// REQUEST KE CLOUDFLARE WORKER
// =====================================================

async function apiRequest(ticker) {

    const cleanTicker =
        normalizeTicker(ticker);


    if (!cleanTicker) {

        throw new Error(
            "Ticker kosong."
        );

    }


    // =================================================
    // REQUEST
    // =================================================
    //
    // FORMAT WORKER:
    //
    // ?code=BBCA&length=150
    //
    // JANGAN menggunakan:
    //
    // ?path=...
    //
    // =================================================

    const params =
        new URLSearchParams({

            code:
                cleanTicker,

            length:
                String(SETTINGS.length)

        });


    const url =
        `${PROXY_URL}/?${params.toString()}`;


    console.log(
        `[MONEY STYLE] ${cleanTicker} → Worker`,
        url
    );


    let response;


    try {

        response =
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

    }

    catch (error) {

        throw new Error(

            `${cleanTicker}: gagal menghubungi Cloudflare Worker. ` +
            `${error?.message || ""}`

        );

    }


    // =================================================
    // RESPONSE TEXT
    // =================================================

    const text =
        await response.text();


    // =================================================
    // PARSE JSON
    // =================================================

    let data;


    try {

        data =
            JSON.parse(text);

    }

    catch {

        throw new Error(

            `${cleanTicker}: Worker mengembalikan response bukan JSON. ` +
            `HTTP ${response.status}. ` +
            text.slice(0, 300)

        );

    }


    // =================================================
    // HTTP ERROR
    // =================================================

    if (
        !response.ok
    ) {

        throw new Error(

            data?.message ||
            data?.error ||
            `${cleanTicker}: Worker HTTP ${response.status}`

        );

    }


    // =================================================
    // API ERROR
    // =================================================

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
// EXTRACT ITEMS
// =====================================================
//
// Response Zapi yang kita gunakan:
//
// {
//   "project": "finance:idx:stock-history",
//   "data": {
//      "provider": "idx",
//      "dataset": "stock-history",
//      "code": "BBCA",
//      "count": 150,
//      "items": [...]
//
// }
//
// =====================================================

function extractItems(data) {

    if (
        Array.isArray(
            data?.data?.items
        )
    ) {

        return data.data.items;

    }


    if (
        Array.isArray(
            data?.items
        )
    ) {

        return data.items;

    }


    if (
        Array.isArray(data)
    ) {

        return data;

    }


    return [];

}


// =====================================================
// NORMALIZE BAR
// =====================================================

function normalizeBar(row) {

    if (!row) {

        return null;

    }


    // =================================================
    // OHLC
    // =================================================

    const open =
        toNumber(
            row.open
        );


    const high =
        toNumber(
            row.high
        );


    const low =
        toNumber(
            row.low
        );


    const close =
        toNumber(
            row.close
        );


    // =================================================
    // PREVIOUS CLOSE
    // =================================================

    const previous =
        toNumber(
            row.previous
        );


    // =================================================
    // VOLUME
    // =================================================

    const volume =
        toNumber(
            row.volume
        );


    // =================================================
    // VALIDASI
    // =================================================

    if (
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close) ||
        !Number.isFinite(volume)
    ) {

        return null;

    }


    // =================================================
    // RETURN CANDLE
    // =================================================

    return {

        date:
            row.date ?? null,

        datetime:
            row.date ?? null,

        open,

        high,

        low,

        close,

        previous,

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

        console.log(
            `[MONEY STYLE] ${cleanTicker} menggunakan cache`
        );

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
    // ITEMS
    // =================================================

    const items =
        extractItems(
            response
        );


    if (
        items.length === 0
    ) {

        throw new Error(

            `${cleanTicker}: response tidak memiliki data historical.`

        );

    }


    // =================================================
    // NORMALIZE OHLCV
    // =================================================

    const bars =
        items
            .map(
                normalizeBar
            )
            .filter(
                Boolean
            );


    if (
        bars.length === 0
    ) {

        throw new Error(

            `${cleanTicker}: data OHLCV tidak valid.`

        );

    }


    // =================================================
    // URUTKAN CANDLE
    // =================================================
    //
    // Response Zapi:
    //
    // terbaru → lama
    //
    // Engine kita membutuhkan:
    //
    // lama → terbaru
    //
    // Karena signal.js menggunakan:
    //
    // candles[candles.length - 1]
    //
    // sebagai candle terbaru.
    //
    // =================================================

    bars.sort(
        (a, b) => {

            const dateA =
                new Date(
                    a.date
                ).getTime();

            const dateB =
                new Date(
                    b.date
                ).getTime();

            return dateA - dateB;

        }
    );


    // =================================================
    // CANDLE TERBARU
    // =================================================

    const latest =
        bars[
            bars.length - 1
        ];


    if (!latest) {

        throw new Error(

            `${cleanTicker}: candle terbaru tidak tersedia.`

        );

    }


    // =================================================
    // PRICE
    // =================================================

    const price =
        latest.close;


    // =================================================
    // CHANGE %
    // =================================================

    let changePercent = 0;


    // Prioritas:
    // previous dari Zapi

    if (
        Number.isFinite(
            latest.previous
        ) &&
        latest.previous !== 0
    ) {

        changePercent =
            (
                (
                    latest.close -
                    latest.previous
                ) /
                latest.previous
            ) * 100;

    }

    // Fallback:
    // candle sebelumnya

    else if (
        bars.length >= 2
    ) {

        const previousBar =
            bars[
                bars.length - 2
            ];


        if (
            Number.isFinite(
                previousBar.close
            ) &&
            previousBar.close !== 0
        ) {

            changePercent =
                (
                    (
                        latest.close -
                        previousBar.close
                    ) /
                    previousBar.close
                ) * 100;

        }

    }


    // =================================================
    // RESULT
    // =================================================

    const result = {

        ticker:
            cleanTicker,

        price,

        changePercent,

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
                "Zapi IDX Stock History via Cloudflare Worker",

            endpoint:
                "finance:idx:stock-history",

            proxy:
                PROXY_URL,

            count:
                bars.length,

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


    // =================================================
    // DEBUG
    // =================================================

    console.log(
        `[MONEY STYLE] ${cleanTicker} selesai`,
        {
            price:
                result.price,

            changePercent:
                result.changePercent,

            bars:
                result.bars.length,

            latestDate:
                latest.date
        }
    );


    return result;

}


// =====================================================
// CLEAR CACHE
// =====================================================

export function clearMarketCache() {

    marketCache.clear();

    console.log(
        "[MONEY STYLE] Market cache cleared"
    );

}
