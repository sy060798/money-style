// =====================================================
// MONEY STYLE SCANNER
// engine/profile.js
// =====================================================

export function calculateVolumeProfile(candles, settings = {}) {
    const {
        lookback = 150,
        pocLookback = 50,
        bins = 30,
        valueAreaPercent = 70
    } = settings;

    if (!Array.isArray(candles) || candles.length === 0) {
        return null;
    }

    // Ambil data terbaru sesuai lookback
    const profileCandles = candles.slice(-lookback);

    if (profileCandles.length < 20) {
        return null;
    }

    // -------------------------------------------------
    // RANGE HARGA
    // -------------------------------------------------

    const highs = profileCandles.map(c => Number(c.high));
    const lows = profileCandles.map(c => Number(c.low));

    const profileHigh = Math.max(...highs);
    const profileLow = Math.min(...lows);

    const priceRange = profileHigh - profileLow;

    if (!Number.isFinite(priceRange) || priceRange <= 0) {
        return null;
    }

    const binSize = priceRange / bins;

    if (!Number.isFinite(binSize) || binSize <= 0) {
        return null;
    }

    // -------------------------------------------------
    // VOLUME BINS
    // -------------------------------------------------

    const volumeBins = new Array(bins).fill(0);

    // Hanya volume terbaru untuk POC aktif
    const recentCandles = candles.slice(-pocLookback);

    for (const candle of recentCandles) {
        const price = Number(candle.close);
        const volume = Number(candle.volume);

        if (
            !Number.isFinite(price) ||
            !Number.isFinite(volume) ||
            volume < 0
        ) {
            continue;
        }

        let index = Math.floor(
            (price - profileLow) / binSize
        );

        index = Math.max(
            0,
            Math.min(bins - 1, index)
        );

        volumeBins[index] += volume;
    }

    // -------------------------------------------------
    // CARI POC
    // -------------------------------------------------

    let pocIndex = 0;
    let pocVolume = 0;

    for (let i = 0; i < bins; i++) {
        if (volumeBins[i] > pocVolume) {
            pocVolume = volumeBins[i];
            pocIndex = i;
        }
    }

    const pocLow =
        profileLow + pocIndex * binSize;

    const pocHigh =
        pocLow + binSize;

    const pocPrice =
        (pocLow + pocHigh) / 2;

    // -------------------------------------------------
    // VALUE AREA
    // -------------------------------------------------

    const totalVolume =
        volumeBins.reduce(
            (sum, value) => sum + value,
            0
        );

    const targetVolume =
        totalVolume *
        (valueAreaPercent / 100);

    let valueLowIndex = pocIndex;
    let valueHighIndex = pocIndex;

    let accumulatedVolume =
        volumeBins[pocIndex];

    for (let step = 0; step < bins; step++) {

        if (accumulatedVolume >= targetVolume) {
            break;
        }

        const canGoLow =
            valueLowIndex > 0;

        const canGoHigh =
            valueHighIndex < bins - 1;

        const lowerVolume =
            canGoLow
                ? volumeBins[valueLowIndex - 1]
                : -1;

        const upperVolume =
            canGoHigh
                ? volumeBins[valueHighIndex + 1]
                : -1;

        if (
            canGoHigh &&
            (
                !canGoLow ||
                upperVolume >= lowerVolume
            )
        ) {
            valueHighIndex++;

            accumulatedVolume +=
                volumeBins[valueHighIndex];

        } else if (canGoLow) {

            valueLowIndex--;

            accumulatedVolume +=
                volumeBins[valueLowIndex];

        } else {
            break;
        }
    }

    // -------------------------------------------------
    // VALUE AREA PRICE
    // -------------------------------------------------

    const valueAreaLow =
        profileLow +
        valueLowIndex * binSize;

    const valueAreaHigh =
        profileLow +
        (valueHighIndex + 1) * binSize;

    // -------------------------------------------------
    // HASIL PROFILE
    // -------------------------------------------------

    return {
        profileHigh,
        profileLow,
        priceRange,
        binSize,

        bins,

        volumeBins,

        pocIndex,
        pocVolume,
        pocPrice,

        valueLowIndex,
        valueHighIndex,

        valueAreaLow,
        valueAreaHigh,

        totalVolume,

        // Data tambahan untuk UI
        recentCandles: recentCandles.length,
        profileCandles: profileCandles.length
    };
}
