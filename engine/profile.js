// =====================================================
// MONEY STYLE SCANNER
// engine/profile.js
// =====================================================

export function calculateProfile(bars, settings = {}) {

    const lookback =
        Number(settings.lookback ?? 150);

    const pocLookback =
        Number(settings.pocLookback ?? 50);

    const bins =
        Number(settings.bins ?? 30);

    const valueAreaPercent =
        Number(settings.valueAreaPercent ?? 70);

    const redZoneBins =
        Number(settings.redZoneBins ?? 1);

    const maxDistanceBins =
        Number(settings.maxDistanceBins ?? 2);


    // =====================================================
    // VALIDASI
    // =====================================================

    if (!Array.isArray(bars)) {
        throw new Error("Profile: bars bukan array");
    }

    if (bars.length === 0) {
        throw new Error("Profile: data candle kosong");
    }

    if (bins < 1) {
        throw new Error("Profile: bins tidak valid");
    }


    // =====================================================
    // AMBIL DATA
    // =====================================================

    const profileBars =
        bars.slice(
            0,
            Math.min(
                lookback,
                bars.length
            )
        );

    const pocBars =
        bars.slice(
            0,
            Math.min(
                pocLookback,
                bars.length
            )
        );


    // =====================================================
    // HIGH / LOW PROFILE
    // =====================================================

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

        if (high > profileHigh) {
            profileHigh = high;
        }

        if (low < profileLow) {
            profileLow = low;
        }
    }


    if (
        !Number.isFinite(profileHigh) ||
        !Number.isFinite(profileLow)
    ) {
        throw new Error(
            "Profile: OHLC tidak valid"
        );
    }


    // =====================================================
    // RANGE
    // =====================================================

    const priceRange =
        profileHigh - profileLow;

    if (priceRange <= 0) {
        throw new Error(
            "Profile: price range = 0"
        );
    }


    const binSize =
        priceRange / bins;


    // =====================================================
    // VOLUME BINS
    // =====================================================

    const volumeBins =
        new Array(bins).fill(0);


    // =====================================================
    // MASUKKAN VOLUME KE BIN
    // =====================================================

    for (const bar of pocBars) {

        const close =
            Number(bar.close);

        const volume =
            Number(bar.volume);

        if (
            !Number.isFinite(close) ||
            !Number.isFinite(volume) ||
            volume < 0
        ) {
            continue;
        }


        let index =
            Math.floor(
                (close - profileLow) /
                binSize
            );


        if (index < 0) {
            index = 0;
        }

        if (index >= bins) {
            index = bins - 1;
        }


        volumeBins[index] += volume;
    }


    // =====================================================
    // CARI POC
    // =====================================================

    let pocIndex = 0;
    let pocVolume = 0;

    for (let i = 0; i < bins; i++) {

        if (
            volumeBins[i] >
            pocVolume
        ) {

            pocVolume =
                volumeBins[i];

            pocIndex = i;
        }
    }


    // =====================================================
    // TOTAL VOLUME
    // =====================================================

    let totalVolume = 0;

    for (const volume of volumeBins) {
        totalVolume += volume;
    }


    // =====================================================
    // VALUE AREA
    // =====================================================

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


        if (
            upperVolume >=
            lowerVolume
        ) {

            if (!canGoHigh) {
                break;
            }

            valueHighIndex++;

            accumulatedVolume +=
                volumeBins[
                    valueHighIndex
                ];

        } else {

            if (!canGoLow) {
                break;
            }

            valueLowIndex--;

            accumulatedVolume +=
                volumeBins[
                    valueLowIndex
                ];
        }
    }


    // =====================================================
    // POC PRICE
    // =====================================================

    const pocLow =
        profileLow +
        pocIndex * binSize;

    const pocHigh =
        pocLow +
        binSize;

    const pocPrice =
        (pocLow + pocHigh) / 2;


    // =====================================================
    // VAH / VAL
    // =====================================================
    // INI HARGA ASLI.
    // BUKAN PERSENTASE.
    // =====================================================

    const valueAreaLow =
        profileLow +
        valueLowIndex * binSize;

    const valueAreaHigh =
        profileLow +
        (valueHighIndex + 1) * binSize;


    // =====================================================
    // RED ZONE
    // =====================================================

    const redLowIndex =
        Math.max(
            0,
            pocIndex - redZoneBins
        );

    const redHighIndex =
        Math.min(
            bins - 1,
            pocIndex + redZoneBins
        );


    const redZoneLow =
        profileLow +
        redLowIndex * binSize;

    const redZoneHigh =
        profileLow +
        (redHighIndex + 1) * binSize;


    // =====================================================
    // INVALID BUY
    // =====================================================

    const invalidBuyLowIndex =
        Math.max(
            0,
            redLowIndex -
            maxDistanceBins
        );


    const invalidBuyLow =
        profileLow +
        invalidBuyLowIndex * binSize;


    // =====================================================
    // PROFILE STRENGTH
    // =====================================================

    let maxProfileVolume = 0;

    for (const volume of volumeBins) {

        if (
            volume >
            maxProfileVolume
        ) {
            maxProfileVolume =
                volume;
        }
    }


    // =====================================================
    // POC POSITION
    // =====================================================

    const pocPosition =
        (
            (pocPrice - profileLow) /
            priceRange
        ) * 100;


    const profileStrength =
        maxProfileVolume > 0
            ? (
                pocVolume /
                maxProfileVolume
            ) * 100
            : 0;


    // =====================================================
    // RETURN
    // =====================================================

    return {

        // PROFILE RANGE
        profileHigh,
        profileLow,
        priceRange,
        binSize,

        // POC
        pocIndex,
        pocVolume,
        pocPrice,

        // VALUE AREA
        valueLowIndex,
        valueHighIndex,

        // HARGA VAH / VAL
        valueAreaLow,
        valueAreaHigh,

        // RED ZONE
        redLowIndex,
        redHighIndex,

        redZoneLow,
        redZoneHigh,

        // INVALID BUY
        invalidBuyLow,

        // VOLUME PROFILE
        volumeBins,
        maxProfileVolume,

        // VISUAL INTERNAL
        pocPosition,
        profileStrength,

        // SETTINGS
        lookback,
        pocLookback,
        bins,
        valueAreaPercent,
        redZoneBins,
        maxDistanceBins
    };
}
