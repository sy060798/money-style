// =====================================================
// MONEY STYLE SCANNER
// engine/profile.js
// =====================================================

export function calculateProfile(bars, settings = {}) {

    const {
        lookback = 150,
        pocLookback = 50,
        bins = 30,
        valueAreaPercent = 70,
        redZoneBins = 1,
        maxDistanceBins = 2
    } = settings;


    // =================================================
    // VALIDASI
    // =================================================

    if (!Array.isArray(bars) || bars.length === 0) {
        throw new Error("Profile: data candle kosong");
    }

    if (bins < 1) {
        throw new Error("Profile: bins tidak valid");
    }


    // =================================================
    // AMBIL DATA
    // =================================================

    // bars[0] = candle terbaru
    const profileBars = bars.slice(
        0,
        Math.min(lookback, bars.length)
    );

    const pocBars = bars.slice(
        0,
        Math.min(pocLookback, bars.length)
    );


    if (profileBars.length === 0) {
        throw new Error("Profile: tidak ada candle");
    }


    // =================================================
    // PROFILE HIGH / LOW
    // =================================================

    let profileHigh = -Infinity;
    let profileLow = Infinity;

    for (const bar of profileBars) {

        const high = Number(bar.high);
        const low = Number(bar.low);

        if (
            !Number.isFinite(high) ||
            !Number.isFinite(low)
        ) {
            continue;
        }

        profileHigh = Math.max(
            profileHigh,
            high
        );

        profileLow = Math.min(
            profileLow,
            low
        );
    }


    if (
        !Number.isFinite(profileHigh) ||
        !Number.isFinite(profileLow)
    ) {
        throw new Error(
            "Profile: OHLC tidak valid"
        );
    }


    // =================================================
    // PRICE RANGE
    // =================================================

    const priceRange =
        profileHigh - profileLow;


    if (priceRange <= 0) {
        throw new Error(
            "Profile: price range = 0"
        );
    }


    const binSize =
        priceRange / bins;


    if (
        !Number.isFinite(binSize) ||
        binSize <= 0
    ) {
        throw new Error(
            "Profile: bin size tidak valid"
        );
    }


    // =================================================
    // VOLUME BINS
    // =================================================

    const volumeBins =
        new Array(bins).fill(0);


    // =================================================
    // MASUKKAN VOLUME POC
    // =====================================================
    //
    // HANYA pocLookback candle terbaru.
    //
    // Ini sama dengan Pine:
    //
    // pocLookback = 50
    //
    // Jadi POC tidak memakai seluruh 150 candle.
    // =================================================

    for (const bar of pocBars) {

        const price =
            Number(bar.close);

        const volume =
            Number(bar.volume);


        if (
            !Number.isFinite(price) ||
            !Number.isFinite(volume) ||
            volume < 0
        ) {
            continue;
        }


        const rawIndex =
            Math.floor(
                (price - profileLow) /
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


        volumeBins[index] += volume;
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

        if (volume > pocVolume) {

            pocVolume =
                volume;

            pocIndex =
                i;
        }
    }


    // =================================================
    // TOTAL VOLUME
    // =================================================

    const totalVolume =
        volumeBins.reduce(
            (sum, value) =>
                sum + value,
            0
        );


    // =================================================
    // VALUE AREA
    // =================================================

    const targetVolume =
        totalVolume *
        valueAreaPercent /
        100;


    let valueLowIndex =
        pocIndex;

    let valueHighIndex =
        pocIndex;

    let accumulatedVolume =
        volumeBins[pocIndex];


    // =================================================
    // EXPAND VALUE AREA
    // =================================================

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
        // PILIH SISI DENGAN VOLUME LEBIH BESAR
        // ---------------------------------------------

        if (
            upperVolume >=
            lowerVolume
        ) {

            if (canGoHigh) {

                valueHighIndex++;

                accumulatedVolume +=
                    volumeBins[
                        valueHighIndex
                    ];
            }

        } else {

            if (canGoLow) {

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
        pocIndex *
        binSize;


    const pocHigh =
        pocLow +
        binSize;


    // POC = tengah bin
    const pocPrice =
        (
            pocLow +
            pocHigh
        ) / 2;


    // =================================================
    // VAH / VAL
    // =================================================
    //
    // INI HARGA ASLI.
    //
    // BUKAN PERSENTASE.
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
    // INVALID BUY
    // =================================================

    const invalidBuyLowIndex =
        Math.max(
            0,
            redLowIndex -
            maxDistanceBins
        );


    const invalidBuyLow =
        profileLow +
        invalidBuyLowIndex *
        binSize;


    // =================================================
    // PROFILE STRENGTH
    // =================================================

    const maxProfileVolume =
        Math.max(
            ...volumeBins
        );


    // =================================================
    // POC POSITION
    // =================================================

    const pocPosition =
        (
            (
                pocPrice -
                profileLow
            ) /
            priceRange
        ) * 100;


    // =================================================
    // PROFILE STRENGTH %
    // =================================================

    const profileStrength =
        maxProfileVolume > 0
            ? (
                pocVolume /
                maxProfileVolume
            ) * 100
            : 0;


    // =================================================
    // RETURN
    // =================================================

    return {

        // ---------------------------------------------
        // RANGE
        // ---------------------------------------------

        profileHigh,
        profileLow,
        priceRange,
        binSize,


        // ---------------------------------------------
        // POC
        // ---------------------------------------------

        pocIndex,
        pocVolume,
        pocPrice,


        // ---------------------------------------------
        // VALUE AREA
        // ---------------------------------------------

        valueLowIndex,
        valueHighIndex,

        // HARGA ASLI
        valueAreaLow,
        valueAreaHigh,


        // ---------------------------------------------
        // RED ZONE
        // ---------------------------------------------

        redLowIndex,
        redHighIndex,

        redZoneLow,
        redZoneHigh,


        // ---------------------------------------------
        // INVALID BUY
        // ---------------------------------------------

        invalidBuyLow,


        // ---------------------------------------------
        // PROFILE
        // ---------------------------------------------

        volumeBins,
        maxProfileVolume,

        pocPosition,
        profileStrength,


        // ---------------------------------------------
        // SETTINGS
        // ---------------------------------------------

        lookback,
        pocLookback,
        bins,
        valueAreaPercent,
        redZoneBins,
        maxDistanceBins
    };
}
