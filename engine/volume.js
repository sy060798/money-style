// =====================================================
// MONEY STYLE SCANNER
// engine/volume.js
// =====================================================

export function calculateVolume(candles, settings = {}) {

    // =================================================
    // SETTINGS
    // =================================================

    const volumePeriod =
        Number(settings.volumePeriod ?? 20);

    const volumeSpikeMult =
        Number(settings.volumeSpikeMult ?? 2.0);


    // =================================================
    // VALIDASI SETTINGS
    // =================================================

    if (
        !Number.isFinite(volumePeriod) ||
        volumePeriod < 1
    ) {
        return null;
    }

    if (
        !Number.isFinite(volumeSpikeMult) ||
        volumeSpikeMult <= 0
    ) {
        return null;
    }


    // =================================================
    // VALIDASI DATA
    // =================================================

    if (
        !Array.isArray(candles) ||
        candles.length === 0
    ) {
        return null;
    }


    // =================================================
    // NORMALISASI CANDLE
    // =================================================
    //
    // Zapi:
    // terbaru -> terlama
    //
    // Engine:
    // terlama -> terbaru
    // =================================================

    const normalizedCandles =
        candles
            .map((candle) => {

                if (!candle) {
                    return null;
                }

                const date =
                    candle.date ?? null;

                const open =
                    Number(candle.open);

                const high =
                    Number(candle.high);

                const low =
                    Number(candle.low);

                const close =
                    Number(candle.close);

                const volume =
                    Number(candle.volume);


                if (
                    !Number.isFinite(open) ||
                    !Number.isFinite(high) ||
                    !Number.isFinite(low) ||
                    !Number.isFinite(close) ||
                    !Number.isFinite(volume)
                ) {
                    return null;
                }


                if (volume < 0) {
                    return null;
                }


                if (high < low) {
                    return null;
                }


                return {
                    ...candle,

                    date,

                    open,
                    high,
                    low,
                    close,
                    volume
                };
            })
            .filter(Boolean);


    if (
        normalizedCandles.length === 0
    ) {
        return null;
    }


    // =================================================
    // URUTKAN CANDLE
    // =================================================
    //
    // Terlama -> terbaru
    //
    // Supaya:
    //
    // candles[candles.length - 1]
    //
    // selalu candle terbaru.
    // =================================================

    const hasDates =
        normalizedCandles.every(
            candle => Boolean(candle.date)
        );


    if (hasDates) {

        normalizedCandles.sort(
            (a, b) => {

                const timeA =
                    new Date(a.date).getTime();

                const timeB =
                    new Date(b.date).getTime();


                if (
                    !Number.isFinite(timeA) ||
                    !Number.isFinite(timeB)
                ) {
                    return 0;
                }


                return timeA - timeB;
            }
        );
    }


    // =================================================
    // VALIDASI JUMLAH CANDLE
    // =================================================

    if (
        normalizedCandles.length <
        volumePeriod
    ) {
        return null;
    }


    // =================================================
    // CANDLE TERBARU
    // =================================================

    const current =
        normalizedCandles[
            normalizedCandles.length - 1
        ];


    const open =
        current.open;

    const high =
        current.high;

    const low =
        current.low;

    const close =
        current.close;

    const volume =
        current.volume;


    // =================================================
    // VOLUME WINDOW
    // =================================================

    const volumeWindow =
        normalizedCandles.slice(
            -Math.floor(volumePeriod)
        );


    const validVolumes =
        volumeWindow
            .map(
                candle =>
                    Number(candle.volume)
            )
            .filter(
                value =>
                    Number.isFinite(value) &&
                    value >= 0
            );


    if (
        validVolumes.length === 0
    ) {
        return null;
    }


    // =================================================
    // VOLUME RATA-RATA
    // =================================================

    const averageVolume =
        validVolumes.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        validVolumes.length;


    // =================================================
    // VOLUME RATIO
    // =================================================

    const volumeRatio =
        averageVolume > 0
            ? volume /
              averageVolume
            : 0;


    // =================================================
    // VOLUME SPIKE
    // =================================================

    const volumeSpike =
        volumeRatio >=
        volumeSpikeMult;


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
    // CANDLE RANGE
    // =================================================

    const candleRange =
        high - low;


    const candleBody =
        Math.abs(
            close - open
        );


    // =================================================
    // BODY RATIO
    // =================================================

    const bodyRatio =
        candleRange > 0
            ? candleBody /
              candleRange
            : 0;


    // =================================================
    // CLOSE POSITION
    // =================================================
    //
    // 0 = dekat LOW
    // 1 = dekat HIGH
    // =================================================

    const closePosition =
        candleRange > 0
            ? (
                close - low
            ) /
            candleRange
            : 0.5;


    // =================================================
    // BUY / SELL PRESSURE
    // =================================================

    let pressure =
        "NORMAL";


    if (
        volumeSpike &&
        bearishCandle
    ) {

        pressure =
            "SELL";

    } else if (
        volumeSpike &&
        bullishCandle
    ) {

        pressure =
            "BUY";
    }


    // =================================================
    // DUMP PRESSURE
    // =================================================
    //
    // Volume besar + candle bearish.
    //
    // Ini hanya tekanan jual,
    // bukan otomatis manipulasi.
    // =================================================

    const dumpPressure =
        volumeSpike &&
        bearishCandle;


    // =================================================
    // ABSORPTION
    // =================================================
    //
    // Volume tinggi tetapi body kecil.
    // =================================================

    const absorption =
        volumeSpike &&
        bodyRatio <= 0.35;


    // =================================================
    // HASIL
    // =================================================

    return {

        // ---------------------------------------------
        // DATA CANDLE TERBARU
        // ---------------------------------------------

        date:
            current.date ?? null,

        open,
        high,
        low,
        close,


        // ---------------------------------------------
        // VOLUME
        // ---------------------------------------------

        volume,

        averageVolume,

        volumeRatio,

        volumeSpike,


        // ---------------------------------------------
        // CANDLE
        // ---------------------------------------------

        bullishCandle,

        bearishCandle,

        neutralCandle,


        // ---------------------------------------------
        // STRUKTUR CANDLE
        // ---------------------------------------------

        candleRange,

        candleBody,

        bodyRatio,

        closePosition,


        // ---------------------------------------------
        // PRESSURE
        // ---------------------------------------------

        pressure,


        // ---------------------------------------------
        // SIGNAL TAMBAHAN
        // ---------------------------------------------

        dumpPressure,

        absorption,


        // ---------------------------------------------
        // META
        // ---------------------------------------------

        candleCount:
            normalizedCandles.length,

        period:
            volumePeriod,

        spikeMultiplier:
            volumeSpikeMult
    };
}
