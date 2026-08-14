// =====================================================
// MONEY STYLE SCANNER
// api/market.js
// =====================================================

const API_KEY = "ISI_API_KEY_TWELVE_DATA_DI_SINI";

const BASE_URL = "https://api.twelvedata.com";


// =====================================================
// SETTINGS
// =====================================================

const MARKET_SETTINGS = {
    interval: "1day",
    outputsize: 180
};


// =====================================================
// GET MARKET DATA
// =====================================================

export async function getMarketData(ticker) {

    if (!ticker) {
        throw new Error("Ticker kosong");
    }

    if (
        !API_KEY ||
        API_KEY === "ISI_API_KEY_TWELVE_DATA_DI_SINI"
    ) {
        throw new Error(
            "API key Twelve Data belum diisi"
        );
    }


    // -------------------------------------------------
    // REQUEST
    // -------------------------------------------------

    const params = new URLSearchParams({

        symbol: ticker,

        interval:
            MARKET_SETTINGS.interval,

        outputsize:
            String(
                MARKET_SETTINGS.outputsize
            ),

        apikey:
            API_KEY

    });


    const url =
        `${BASE_URL}/time_series?${params.toString()}`;


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status}`
        );
    }


    const data =
        await response.json();


    // -------------------------------------------------
    // API ERROR
    // -------------------------------------------------

    if (
        data.status === "error" ||
        data.code
    ) {

        throw new Error(
            data.message ||
            "Market API error"
        );
    }


    if (
        !Array.isArray(data.values) ||
        data.values.length === 0
    ) {

        throw new Error(
            `Data ${ticker} tidak ditemukan`
        );
    }


    // -------------------------------------------------
    // NORMALIZE OHLCV
    // -------------------------------------------------
    //
    // Twelve Data biasanya mengembalikan data
    // terbaru terlebih dahulu.
    //
    // Engine kita menggunakan:
    //
    // bars[0] = candle TERBARU
    //
    // sehingga tidak perlu dibalik.
    // -------------------------------------------------

    const bars =
        data.values
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


    // -------------------------------------------------
    // CURRENT PRICE
    // -------------------------------------------------

    const latest =
        bars[0];


    const price =
        latest.close;


    // -------------------------------------------------
    // CHANGE %
    // -------------------------------------------------

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
            ) *
            100;
    }


    // -------------------------------------------------
    // RETURN
    // -------------------------------------------------

    return {

        ticker:

            data.meta?.symbol ||
            ticker,

        price,

        changePercent,

        bars,

        meta: {

            exchange:
                data.meta?.exchange ||
                null,

            exchangeTimezone:
                data.meta?.exchange_timezone ||
                null,

            currency:
                data.meta?.currency ||
                null,

            interval:
                data.meta?.interval ||
                MARKET_SETTINGS.interval

        }

    };
}
