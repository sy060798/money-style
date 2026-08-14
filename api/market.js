// =====================================================
// MONEY STYLE SCANNER
// api/market.js
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
    outputsize: 180,

    // Bursa Indonesia
    micCode: "XIDX",

    // Cache symbol supaya tidak search berulang
    cacheDuration: 24 * 60 * 60 * 1000
};


// =====================================================
// SYMBOL CACHE
// =====================================================

const symbolCache = new Map();


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

async function apiRequest(endpoint, params) {

    const searchParams =
        new URLSearchParams({
            ...params,
            apikey: API_KEY
        });

    const url =
        `${BASE_URL}${endpoint}?${searchParams.toString()}`;

    const response =
        await fetch(url);

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error(
            `Response API tidak valid (${response.status})`
        );
    }

    if (!response.ok) {

        throw new Error(
            data?.message ||
            `HTTP ${response.status}`
        );
    }

    if (
        data?.status === "error" ||
        data?.code
    ) {

        throw new Error(
            data?.message ||
            "Twelve Data API error"
        );
    }

    return data;
}


// =====================================================
// CARI SYMBOL IDX
// =====================================================
//
// Kita tidak lagi mengasumsikan:
//
// BBRI + XIDX = valid.
//
// Twelve Data punya endpoint symbol_search.
// Hasilnya kita filter berdasarkan:
// - ticker
// - exchange / MIC
// - Indonesia
//
// =====================================================

async function findIDXSymbol(ticker) {

    const cleanTicker =
        normalizeTicker(ticker);

    if (!cleanTicker) {

        throw new Error(
            "Ticker kosong"
        );
    }


    // -----------------------------------------------
    // CACHE
    // -----------------------------------------------

    const cached =
        symbolCache.get(cleanTicker);

    if (
        cached &&
        Date.now() - cached.time <
            MARKET_SETTINGS.cacheDuration
    ) {

        return cached.symbol;
    }


    // -----------------------------------------------
    // SYMBOL SEARCH
    // -----------------------------------------------

    const data =
        await apiRequest(
            "/symbol_search",
            {
                symbol: cleanTicker
            }
        );


    const items =
        Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
                ? data
                : [];


    // -----------------------------------------------
    // FILTER INDONESIA
    // -----------------------------------------------

    const candidates =
        items.filter(item => {

            const symbol =
                normalizeTicker(
                    item?.symbol
                );

            const exchange =
                String(
                    item?.exchange || ""
                ).toUpperCase();

            const mic =
                String(
                    item?.mic_code || ""
                ).toUpperCase();

            const country =
                String(
                    item?.country || ""
                ).toUpperCase();


            const symbolMatch =
                symbol === cleanTicker;


            const exchangeMatch =
                exchange.includes("INDONESIA") ||
                exchange.includes("IDX") ||
                exchange.includes("JAKARTA") ||
                mic === MARKET_SETTINGS.micCode;


            const countryMatch =
                country === "INDONESIA" ||
                country === "ID";


            return (
                symbolMatch &&
                (
                    exchangeMatch ||
                    countryMatch
                )
            );
        });


    // -----------------------------------------------
    // FALLBACK
    // -----------------------------------------------

    let selected =
        candidates[0];


    // Kalau search tidak memberikan hasil
    // yang cukup spesifik, cari lagi dengan
    // ticker + Indonesia.
    if (!selected) {

        const retry =
            await apiRequest(
                "/symbol_search",
                {
                    symbol:
                        `${cleanTicker}:IDX`
                }
            );


        const retryItems =
            Array.isArray(retry?.data)
                ? retry.data
                : Array.isArray(retry)
                    ? retry
                    : [];


        selected =
            retryItems.find(item => {

                const symbol =
                    normalizeTicker(
                        item?.symbol
                    );

                const mic =
                    String(
                        item?.mic_code || ""
                    ).toUpperCase();

                const exchange =
                    String(
                        item?.exchange || ""
                    ).toUpperCase();

                return (
                    symbol === cleanTicker &&
                    (
                        mic ===
                            MARKET_SETTINGS.micCode ||
                        exchange.includes(
                            "INDONESIA"
                        ) ||
                        exchange.includes(
                            "IDX"
                        )
                    )
                );
            });
    }


    // -----------------------------------------------
    // TIDAK DITEMUKAN
    // -----------------------------------------------

    if (!selected) {

        throw new Error(
            `${cleanTicker} tidak ditemukan sebagai saham Indonesia di Twelve Data`
        );
    }


    // -----------------------------------------------
    // SYMBOL FINAL
    // -----------------------------------------------

    const resolvedSymbol =
        selected.symbol;


    symbolCache.set(
        cleanTicker,
        {
            symbol:
                resolvedSymbol,
            time:
                Date.now()
        }
    );


    return resolvedSymbol;
}


// =====================================================
// VALIDATE BAR
// =====================================================

function normalizeBar(row) {

    const bar = {

        datetime:
            row?.datetime,

        open:
            Number(row?.open),

        high:
            Number(row?.high),

        low:
            Number(row?.low),

        close:
            Number(row?.close),

        volume:
            Number(row?.volume)

    };


    if (
        !Number.isFinite(bar.open) ||
        !Number.isFinite(bar.high) ||
        !Number.isFinite(bar.low) ||
        !Number.isFinite(bar.close) ||
        !Number.isFinite(bar.volume)
    ) {

        return null;
    }


    return bar;
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


    if (
        !API_KEY ||
        API_KEY.length < 10
    ) {

        throw new Error(
            "API key Twelve Data belum valid"
        );
    }


    // =================================================
    // 1. RESOLVE SYMBOL IDX
    // =================================================

    const resolvedSymbol =
        await findIDXSymbol(
            cleanTicker
        );


    // =================================================
    // 2. REQUEST TIME SERIES
    // =================================================

    const data =
        await apiRequest(
            "/time_series",
            {
                symbol:
                    resolvedSymbol,

                interval:
                    MARKET_SETTINGS.interval,

                outputsize:
                    String(
                        MARKET_SETTINGS.outputsize
                    ),

                order:
                    "desc"
            }
        );


    // =================================================
    // 3. VALIDASI
    // =================================================

    if (
        !Array.isArray(data?.values) ||
        data.values.length === 0
    ) {

        throw new Error(
            `${cleanTicker}: tidak ada historical data`
        );
    }


    // =================================================
    // 4. NORMALIZE OHLCV
    // =================================================

    const bars =
        data.values
            .map(normalizeBar)
            .filter(Boolean);


    if (bars.length === 0) {

        throw new Error(
            `${cleanTicker}: OHLCV tidak valid`
        );
    }


    // =================================================
    // 5. LATEST
    // =================================================

    const latest =
        bars[0];


    const price =
        latest.close;


    // =================================================
    // 6. CHANGE %
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
    // 7. RETURN
    // =================================================

    return {

        ticker:
            cleanTicker,

        resolvedSymbol,

        price,

        changePercent,

        bars,

        meta: {

            symbol:
                data.meta?.symbol ||
                resolvedSymbol,

            exchange:
                data.meta?.exchange ||
                "Indonesia Stock Exchange",

            micCode:
                data.meta?.mic_code ||
                MARKET_SETTINGS.micCode,

            exchangeTimezone:
                data.meta?.exchange_timezone ||
                "Asia/Jakarta",

            currency:
                data.meta?.currency ||
                "IDR",

            interval:
                data.meta?.interval ||
                MARKET_SETTINGS.interval,

            type:
                data.meta?.type ||
                "Common Stock"

        }

    };
}


// =====================================================
// OPTIONAL:
// CLEAR SYMBOL CACHE
// =====================================================

export function clearSymbolCache() {

    symbolCache.clear();
}
