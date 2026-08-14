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

    length: 150,

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
// REQUEST KE WORKER
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
    // ENDPOINT YANG SUDAH TERBUKTI BERHASIL
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

    } catch (error) {

        throw new Error(
            `${cleanTicker}: gagal menghubungi Worker. ` +
            `${error?.message || ""}`
        );

    }


    const text =
        await response.text();


    let data;

    try {

        data =
            JSON.parse(text);

    } catch {

        throw new Error(

            `${cleanTicker}: Worker mengembalikan response bukan JSON. ` +
            `HTTP ${response.status}. ` +
            text.slice(0, 300)

        );

    }


    if (!response.ok) {

        throw new Error(

            data?.message ||
            data?.error ||
            `${cleanTicker}: Worker HTTP ${response.status}`

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
// AMBIL ITEMS DARI RESPONSE
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
// NORMALIZE CANDLE
// =====================================================

function normalizeBar(row) {

    if (!row) {
        return null;
    }


    const open =
        toNumber(row.open);

    const high =
        toNumber(row.high);

    const low =
        toNumber(row.low);

    const close =
        toNumber(row.close);

    const volume =
        toNumber(row.volume);


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

        date:
            row.date ?? null,

        datetime:
            row.date ?? null,

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
    // ITEMS
    // =================================================

    const items =
        extractItems(response);


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
    // RESPONSE ZAPI SUDAH URUT
    // =================================================
    //
    // Contoh response:
    //
    // 2026-08-14
    // 2026-08-13
    // 2026-08-12
    //
    // Engine signal membutuhkan candle terbaru
    // di index terakhir.
    //
    // Jadi kita balik menjadi:
    //
    // lama → baru
    //
    // =================================================

    bars.sort(
        (a, b) =>
            new Date(a.date) -
            new Date(b.date)
    );


    // =================================================
    // CANDLE TERBARU
    // =================================================

    const latest =
        bars[bars.length - 1];


    // =================================================
    // PRICE
    // =================================================

    const price =
        latest.close;


    // =================================================
    // CHANGE %
    // =================================================

    let changePercent = 0;


    if (
        Number.isFinite(
            latest.previous
        )
    ) {

        if (
            latest.previous !== 0
        ) {

            changePercent =
                (
                    (latest.close -
                        latest.previous) /
                    latest.previous
                ) * 100;

        }

    }

    else if (
        bars.length >= 2
    ) {

        const previous =
            bars[bars.length - 2];


        if (
            previous.close !== 0
        ) {

            changePercent =
                (
                    (latest.close -
                        previous.close) /
                    previous.close
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


    return result;

}


// =====================================================
// CLEAR CACHE
// =====================================================

export function clearMarketCache() {

    marketCache.clear();

}
