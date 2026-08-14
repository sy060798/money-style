// =====================================================
// MONEY STYLE SCANNER
// engine/volume.js
// =====================================================

export function calculateVolume(candles, settings = {}) {

    const {
        volumePeriod = 20,
        volumeSpikeMult = 2.0
    } = settings;

    if (!Array.isArray(candles) || candles.length === 0) {
        return null;
    }

    if (candles.length < volumePeriod) {
        return null;
    }

    // =================================================
    // CANDLE TERBARU
    // =================================================

    const current = candles[candles.length - 1];

    const open = Number(current.open);
    const high = Number(current.high);
    const low = Number(current.low);
    const close = Number(current.close);
    const volume = Number(current.volume);

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
    // VOLUME RATA-RATA
    // =================================================

    const volumeWindow =
        candles.slice(-volumePeriod);

    const validVolumes =
        volumeWindow
            .map(c => Number(c.volume))
            .filter(v =>
                Number.isFinite(v) &&
                v >= 0
            );

    if (validVolumes.length === 0) {
        return null;
    }

    const averageVolume =
        validVolumes.reduce(
            (sum, v) => sum + v,
            0
        ) / validVolumes.length;

    // =================================================
    // VOLUME RATIO
    // =================================================

    const volumeRatio =
        averageVolume > 0
            ? volume / averageVolume
            : 0;

    const volumeSpike =
        volumeRatio >= volumeSpikeMult;

    // =================================================
    // CANDLE DIRECTION
    // =================================================

    const bullishCandle =
        close > open;

    const bearishCandle =
        close < open;

    const neutralCandle =
        close === open;

    // =================================================
    // BODY
    // =================================================

    const candleRange =
        high - low;

    const candleBody =
        Math.abs(close - open);

    const bodyRatio =
        candleRange > 0
            ? candleBody / candleRange
            : 0;

    // =================================================
    // CLOSE POSITION
    // =================================================
    // 0 = dekat LOW
    // 1 = dekat HIGH
    // =================================================

    const closePosition =
        candleRange > 0
            ? (close - low) / candleRange
            : 0.5;

    // =================================================
    // BUY / SELL PRESSURE
    // =================================================

    let pressure = "NORMAL";

    if (volumeSpike && bearishCandle) {
        pressure = "SELL";
    } else if (volumeSpike && bullishCandle) {
        pressure = "BUY";
    }

    // =================================================
    // DUMP
    // =================================================
    // Volume besar + candle bearish.
    //
    // Belum disebut manipulasi.
    // Ini hanya indikasi tekanan jual.
    // =================================================

    const dumpPressure =
        volumeSpike &&
        bearishCandle;

    // =================================================
    // ABSORPTION
    // =================================================
    // Volume tinggi tetapi candle body relatif kecil.
    //
    // Ini bisa menjadi indikasi adanya transaksi besar
    // yang tidak langsung menghasilkan pergerakan harga.
    // =================================================

    const absorption =
        volumeSpike &&
        bodyRatio <= 0.35;

    // =================================================
    // HASIL
    // =================================================

    return {

        // Harga
        open,
        high,
        low,
        close,

        // Volume
        volume,
        averageVolume,
        volumeRatio,
        volumeSpike,

        // Candle
        bullishCandle,
        bearishCandle,
        neutralCandle,

        // Struktur candle
        candleRange,
        candleBody,
        bodyRatio,
        closePosition,

        // Pressure
        pressure,

        // Signal tambahan
        dumpPressure,
        absorption,

        period: volumePeriod,
        spikeMultiplier: volumeSpikeMult
    };
}
