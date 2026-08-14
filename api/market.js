// =====================================================
// MONEY STYLE SCANNER
// api/market.js
// ZAPI IDX RAW PASSTHROUGH
// =====================================================

const API_KEY = "zpi_adggofa2ciw6f9uakw5nxifogu";

const BASE_URL =
    "https://zpi.web.id/api/finance/idx/raw";

const SETTINGS = {
    path: "TradingSummary/GetStockSummary",
    length: 1000,
    start: 0,
    cacheDuration: 30 * 1000
};

const cache = new Map();


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

    if (typeof value === "number") {
        return value;
    }

    const text = String(value)
        .replace(/,/g, "")
        .replace(/%/g, "")
        .trim();

    return Number(text);
}


// =====================================================
// REQUEST ZAPI
// =====================================================

async function apiRequest(ticker) {

    const query =
        `length=${SETTINGS.length}` +
        `&start=${SETTINGS.start}` +
        `&kodeEmiten=${encodeURIComponent(ticker)}`;

    const params = new URLSearchParams({
        path: SETTINGS.path,
        query
    });

    const url =
        `${BASE_URL}?${params.toString()}`;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${API_KEY}`
        }
    });

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error(
            `Response Zapi bukan JSON. HTTP ${response.status}`
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

function extractRows(data) {

    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.data)) {
        return data.data;
    }

    if (Array.isArray(data?.data?.data)) {
        return data.data.data;
    }

    if (Array.isArray(data?.result)) {
        return data.result;
    }

    if (Array.isArray(data?.results)) {
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
// GET MARKET DATA
// =====================================================

export async function getMarketData(ticker) {

    const cleanTicker =
        normalizeTicker(ticker);

    if (!cleanTicker) {
        throw new Error("Ticker kosong");
    }


    // =================================================
    // CACHE
    // =================================================

    const cached =
        cache.get(cleanTicker);

    if (
        cached &&
        Date.now() - cached.time <
            SETTINGS.cacheDuration
    ) {

        return cached.data;
    }


    // =================================================
    // REQUEST
    // =================================================

    const response =
        await apiRequest(cleanTicker);


    console.log(
        `[ZAPI] ${cleanTicker}:`,
        response
    );


    // =================================================
    // ROWS
    // =================================================

    const rows =
        extractRows(response);


    if (rows.length === 0) {

        throw new Error(
            `${cleanTicker}: response Zapi tidak memiliki data`
        );
    }


    // =================================================
    // CARI DATA TICKER
    // =================================================

    const stock =
        rows.find(row => {

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
                !code ||
                code === cleanTicker
            );
        }) || rows[0];


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
                    "Harga"
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
    // HISTORICAL BARS
    // =================================================
    //
    // Kita TIDAK membuat candle palsu.
    //
    // Kalau endpoint ini ternyata tidak memberikan
    // OHLCV historical, app akan memberikan error
    // yang jelas.
    //
    // =================================================

    const bars =
        rows
            .map(row => {

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
                                "volumeValue",
                                "VolumeValue",
                                "totalVolume",
                                "TotalVolume"
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
                                "Tanggal"
                            ]
                        ),

                    open,
                    high,
                    low,
                    close,
                    volume
                };

            })
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


    if (!Number.isFinite(finalPrice)) {

        throw new Error(
            `${cleanTicker}: harga tidak ditemukan dari response Zapi`
        );
    }


    // =================================================
    // IMPORTANT
    // =================================================

    if (bars.length === 0) {

        throw new Error(
            `${cleanTicker}: endpoint ${SETTINGS.path} tidak menyediakan OHLCV historical. Diperlukan endpoint historical/StockData untuk POC dan Volume Profile.`
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
            Number.isFinite(changePercent)
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
                "Zapi IDX Raw",

            endpoint:
                SETTINGS.path,

            live:
                true
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
            time: Date.now(),
            data: result
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
