// =====================================================
// MONEY STYLE SCANNER
// engine/profile.js
// =====================================================
// Volume Profile mengikuti Pine Script:
// "Money Style - Volume Spread Profile v3 Adaptive POC"
//
// TIMEFRAME:
// 1H
//
// LOGIC:
// - Profile range       = lookback candle
// - Active POC volume   = pocLookback candle terbaru
// - Volume dimasukkan berdasarkan CLOSE candle
// - POC                  = bin dengan volume terbesar
// - Value Area           = mulai dari POC dan melebar
//   ke sisi dengan volume tetangga terbesar
// =====================================================


export function calculateProfile(
    candles,
    settings = {}
) {

    // =================================================
    // SETTINGS
    // =================================================

    const {
        lookback = 150,
        pocLookback = 50,
        bins = 30,
        valueAreaPercent = 70,
        redZoneBins = 1,
        maxDistanceBins = 2
    } = settings;


    // =================================================
    // VALIDASI INPUT
    // =================================================

    if (
        !Array.isArray(candles) ||
        candles.length === 0
    ) {
        return null;
    }


    if (
        !Number.isFinite(lookback) ||
        !Number.isFinite(pocLookback) ||
        !Number.isFinite(bins) ||
        !Number.isFinite(valueAreaPercent)
    ) {
        return null;
    }


    if (
        lookback <= 0 ||
        pocLookback <= 0 ||
        bins <= 0
    ) {
        return null;
    }


    // =================================================
    // DATA PROFILE
    // =================================================
    //
    // Pine:
    //
    // profileHigh = ta.highest(high, lookback)
    // profileLow  = ta.lowest(low, lookback)
    //
    // Karena JS harus memastikan data cukup,
    // gunakan candle yang tersedia sampai lookback.
    // =================================================

    const profileCandles =
        candles.slice(
            Math.max(
                0,
                candles.length - lookback
            )
        );


    if (
        profileCandles.length === 0
    ) {
        return null;
    }


    // =================================================
    // HITUNG PROFILE HIGH / LOW
    // =================================================

    let profileHigh = -Infinity;
    let profileLow = Infinity;


    for (
        const candle of profileCandles
    ) {

        const high =
            Number(candle.high);

        const low =
            Number(candle.low);


        if (
            Number.isFinite(high)
        ) {

            profileHigh =
                Math.max(
                    profileHigh,
                    high
                );

        }


        if (
            Number.isFinite(low)
        ) {

            profileLow =
                Math.min(
                    profileLow,
                    low
                );

        }

    }


    // =================================================
    // VALID RANGE
    // =================================================

    if (
        !Number.isFinite(profileHigh) ||
        !Number.isFinite(profileLow)
    ) {
        return null;
    }


    const priceRange =
        profileHigh - profileLow;


    if (
        priceRange <= 0
    ) {
        return null;
    }


    // =================================================
    // BIN SIZE
    // =================================================

    const binSize =
        priceRange / bins;


    if (
        !Number.isFinite(binSize) ||
        binSize <= 0
    ) {
        return null;
    }


    // =================================================
    // VOLUME BINS
    // =================================================
    //
    // Sama dengan Pine:
    //
    // for i = 0 to pocLookback - 1
    //
    //     p = close[i]
    //     v = volume[i]
    //
    // Volume candle dimasukkan berdasarkan CLOSE.
    // =================================================

    const volumeBins =
        new Array(bins).fill(0);


    // =================================================
    // CANDLE POC
    // =================================================
    //
    // Pine menggunakan candle terbaru terlebih dahulu.
    // Secara hasil sama dengan mengambil:
    //
    // candles.slice(-pocLookback)
    //
    // lalu semua candle dimasukkan ke bin.
    // =================================================

    const pocCandles =
        candles.slice(
            Math.max(
                0,
                candles.length - pocLookback
            )
        );


    for (
        const candle of pocCandles
    ) {

        const close =
            Number(candle.close);

        const volume =
            Number(candle.volume);


        if (
            !Number.isFinite(close) ||
            !Number.isFinite(volume) ||
            volume < 0
        ) {
            continue;
        }


        // ---------------------------------------------
        // HITUNG INDEX BIN
        // ---------------------------------------------

        const rawIndex =
            Math.floor(
                (close - profileLow) /
                binSize
            );


        const index =
            Math.max(
                0,
                Math.min(
                    bins - 1,
                    rawIndex
                )
            );


        volumeBins[index] +=
            volume;

    }


    // =================================================
    // CARI POC
    // =================================================

    let pocIndex = 0;
    let pocVolume = 0;


    for (
        let i = 0;
        i < bins;
        i++
    ) {

        const volume =
            volumeBins[i];


        // Sama dengan Pine:
        //
        // if v > pocVolume
        //
        // bukan >=
        //
        // sehingga jika volume sama,
        // index pertama tetap dipilih.

        if (
            volume > pocVolume
        ) {

            pocVolume =
                volume;

            pocIndex =
                i;

        }

    }


    // =================================================
    // TOTAL PROFILE VOLUME
    // =================================================

    let totalVolume = 0;


    for (
        let i = 0;
        i < bins;
        i++
    ) {

        totalVolume +=
            volumeBins[i];

    }


    // =================================================
    // VALUE AREA
    // =================================================
    //
    // Pine:
    //
    // targetVolume =
    // totalVolume * valueAreaPercent / 100
    //
    // Mulai dari POC.
    //
    // Kemudian bandingkan:
    // lowerVolume
    // upperVolume
    //
    // Ambil sisi dengan volume lebih besar.
    // =================================================

    let valueLowIndex =
        pocIndex;

    let valueHighIndex =
        pocIndex;


    let accumulatedVolume =
        volumeBins[pocIndex];


    const targetVolume =
        totalVolume *
        valueAreaPercent /
        100;


    for (
        let step = 0;
        step < bins;
        step++
    ) {

        if (
            accumulatedVolume >=
            targetVolume
        ) {
            break;
        }


        const canGoLow =
            valueLowIndex > 0;


        const canGoHigh =
            valueHighIndex <
            bins - 1;


        const lowerVolume =
            canGoLow
                ? volumeBins[
                    valueLowIndex - 1
                ]
                : -1;


        const upperVolume =
            canGoHigh
                ? volumeBins[
                    valueHighIndex + 1
                ]
                : -1;


        // ---------------------------------------------
        // Sama dengan Pine:
        //
        // if upperVolume >= lowerVolume
        //     naik
        // else
        //     turun
        // ---------------------------------------------

        if (
            upperVolume >=
            lowerVolume
        ) {

            if (
                canGoHigh
            ) {

                valueHighIndex++;

                accumulatedVolume +=
                    volumeBins[
                        valueHighIndex
                    ];

            }

        } else {

            if (
                canGoLow
            ) {

                valueLowIndex--;

                accumulatedVolume +=
                    volumeBins[
                        valueLowIndex
                    ];

            }

        }

    }


    // =================================================
    // PRICE LEVEL
    // =================================================

    const pocLow =
        profileLow +
        pocIndex * binSize;


    const pocHigh =
        pocLow +
        binSize;


    // Pine:
    //
    // pocPrice =
    // (pocLow + pocHigh) / 2
    //

    const pocPrice =
        (
            pocLow +
            pocHigh
        ) / 2;


    // =================================================
    // VALUE AREA PRICE
    // =================================================

    const valueAreaLow =
        profileLow +
        valueLowIndex *
        binSize;


    const valueAreaHigh =
        profileLow +
        (
            valueHighIndex + 1
        ) *
        binSize;


    // =================================================
    // RED ZONE
    // =================================================
    //
    // Sama dengan Pine:
    //
    // redLowIndex =
    // max(0, pocIndex - redZoneBins)
    //
    // redHighIndex =
    // min(bins - 1,
    //     pocIndex + redZoneBins)
    // =================================================

    const redLowIndex =
        Math.max(
            0,
            pocIndex -
            redZoneBins
        );


    const redHighIndex =
        Math.min(
            bins - 1,
            pocIndex +
            redZoneBins
        );


    const redZoneLow =
        profileLow +
        redLowIndex *
        binSize;


    const redZoneHigh =
        profileLow +
        (
            redHighIndex + 1
        ) *
        binSize;


    // =================================================
    // INVALID BUY LOW
    // =================================================
    //
    // Sama dengan Pine:
    //
    // invalidBuyLow =
    // profileLow +
    // max(
    //     0,
    //     redLowIndex - maxDistanceBins
    // ) * binSize
    // =================================================

    const invalidBuyIndex =
        Math.max(
            0,
            redLowIndex -
            maxDistanceBins
        );


    const invalidBuyLow =
        profileLow +
        invalidBuyIndex *
        binSize;


    // =================================================
    // PROFILE STRENGTH
    // =================================================
    //
    // Tambahan untuk UI JS.
    //
    // Bukan bagian dari signal Pine.
    // Menunjukkan posisi volume POC relatif terhadap
    // total profile volume.
    // =================================================

    const profileStrength =
        totalVolume > 0
            ? (
                pocVolume /
                totalVolume
            ) * 100
            : 0;


    // =================================================
    // POC POSITION
    // =================================================
    //
    // Posisi POC dalam range profile:
    //
    // 0   = bawah
    // 100 = atas
    // =================================================

    const pocPosition =
        priceRange > 0
            ? (
                (
                    pocPrice -
                    profileLow
                ) /
                priceRange
            ) * 100
            : 50;


    // =================================================
    // VALUE AREA VOLUME
    // =================================================

    let valueAreaVolume = 0;


    for (
        let i = valueLowIndex;
        i <= valueHighIndex;
        i++
    ) {

        valueAreaVolume +=
            volumeBins[i];

    }


    // =================================================
    // VALUE AREA ACTUAL %
    // =================================================

    const actualValueAreaPercent =
        totalVolume > 0
            ? (
                valueAreaVolume /
                totalVolume
            ) * 100
            : 0;


    // =================================================
    // HASIL
    // =================================================

    return {

        // ---------------------------------------------
        // PROFILE RANGE
        // ---------------------------------------------

        profileHigh,
        profileLow,
        priceRange,
        binSize,


        // ---------------------------------------------
        // SETTINGS
        // ---------------------------------------------

        lookback,
        pocLookback,
        bins,
        valueAreaPercent,


        // ---------------------------------------------
        // VOLUME BINS
        // ---------------------------------------------

        volumeBins,


        // ---------------------------------------------
        // POC
        // ---------------------------------------------

        pocIndex,
        pocVolume,
        pocLow,
        pocHigh,
        pocPrice,


        // ---------------------------------------------
        // VALUE AREA
        // ---------------------------------------------

        valueLowIndex,
        valueHighIndex,

        valueAreaLow,
        valueAreaHigh,

        valueAreaVolume,
        actualValueAreaPercent,


        // ---------------------------------------------
        // RED ZONE
        // ---------------------------------------------

        redLowIndex,
        redHighIndex,

        redZoneLow,
        redZoneHigh,


        // ---------------------------------------------
        // BUY INVALIDATION
        // ---------------------------------------------

        invalidBuyIndex,
        invalidBuyLow,


        // ---------------------------------------------
        // UI / ANALYTICS
        // ---------------------------------------------

        profileStrength,
        pocPosition,


        // ---------------------------------------------
        // VALIDATION
        // ---------------------------------------------

        validRange:
            true,

        candleCount:
            profileCandles.length,

        pocCandleCount:
            pocCandles.length

    };

}
