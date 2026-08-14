// =====================================================
// MONEY STYLE SCANNER
// engine/signal.js
// =====================================================

export function calculateSignal(
    candles,
    profile,
    volumeData,
    settings = {}
) {
    if (
        !Array.isArray(candles) ||
        candles.length === 0 ||
        !profile ||
        !volumeData
    ) {
        return null;
    }

    const {
        redZoneBins = 1,
        maxDistanceBins = 2,
        confirmTicks = 1,
        tickSize = 0.01
    } = settings;

    // =================================================
    // DATA TERBARU
    // =================================================

    const current =
        candles[candles.length - 1];

    const close = Number(current.close);
    const high = Number(current.high);
    const low = Number(current.low);
    const open = Number(current.open);

    if (
        !Number.isFinite(close) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(open)
    ) {
        return null;
    }

    // =================================================
    // PROFILE
    // =================================================

    const {
        profileLow,
        binSize,
        pocIndex,
        pocPrice
    } = profile;

    if (
        !Number.isFinite(profileLow) ||
        !Number.isFinite(binSize) ||
        binSize <= 0
    ) {
        return null;
    }

    // =================================================
    // RED ZONE
    // =================================================

    const redLowIndex =
        Math.max(
            0,
            pocIndex - redZoneBins
        );

    const redHighIndex =
        Math.min(
            profile.bins - 1,
            pocIndex + redZoneBins
        );

    const redZoneLow =
        profileLow +
        redLowIndex * binSize;

    const redZoneHigh =
        profileLow +
        (redHighIndex + 1) * binSize;

    // =================================================
    // INVALID BUY AREA
    // =================================================

    const invalidIndex =
        Math.max(
            0,
            redLowIndex - maxDistanceBins
        );

    const invalidBuyLow =
        profileLow +
        invalidIndex * binSize;

    // =================================================
    // POSISI HARGA
    // =================================================

    const insideRedZone =
        low <= redZoneHigh &&
        high >= redZoneLow;

    const belowRedZone =
        close < redZoneLow;

    const aboveRedZone =
        close > redZoneHigh;

    const tooFarBelow =
        close < invalidBuyLow;

    // =================================================
    // CANDLE
    // =================================================

    const bullishCandle =
        close > open;

    const bearishCandle =
        close < open;

    // =================================================
    // DUMP
    // =================================================

    const dump =
        volumeData.volumeSpike &&
        bearishCandle &&
        close <= pocPrice;

    // =================================================
    // RECOVERY
    // =================================================
    //
    // Kita cari low terendah setelah candle yang
    // menyentuh red zone.
    //
    // Karena scanner web melakukan kalkulasi ulang,
    // state dihitung dari candle history asli.
    // =================================================

    let waitingRecovery = false;
    let lowestAfterTouch = null;
    let touchIndex = -1;

    for (
        let i = 0;
        i < candles.length;
        i++
    ) {
        const candle = candles[i];

        const cHigh =
            Number(candle.high);

        const cLow =
            Number(candle.low);

        const cClose =
            Number(candle.close);

        if (
            !Number.isFinite(cHigh) ||
            !Number.isFinite(cLow) ||
            !Number.isFinite(cClose)
        ) {
            continue;
        }

        const candleInsideZone =
            cLow <= redZoneHigh &&
            cHigh >= redZoneLow;

        const candleTooFarBelow =
            cClose < invalidBuyLow;

        // ---------------------------------------------
        // POC LOST
        // ---------------------------------------------

        if (
            waitingRecovery &&
            candleTooFarBelow
        ) {
            waitingRecovery = false;
            lowestAfterTouch = null;
            touchIndex = -1;
        }

        // ---------------------------------------------
        // TOUCH
        // ---------------------------------------------

        if (
            candleInsideZone &&
            !waitingRecovery &&
            !candleTooFarBelow
        ) {
            waitingRecovery = true;

            lowestAfterTouch = cLow;

            touchIndex = i;
        }

        // ---------------------------------------------
        // UPDATE LOW
        // ---------------------------------------------

        if (waitingRecovery) {

            if (
                lowestAfterTouch === null
            ) {
                lowestAfterTouch = cLow;
            } else {
                lowestAfterTouch =
                    Math.min(
                        lowestAfterTouch,
                        cLow
                    );
            }
        }
    }

    // =================================================
    // RECOVERY PRICE
    // =================================================

    let recoveryPrice = null;

    if (
        waitingRecovery &&
        lowestAfterTouch !== null
    ) {
        recoveryPrice =
            lowestAfterTouch +
            confirmTicks * tickSize;
    }

    // =================================================
    // BUY VALIDATION
    // =================================================

    const buyPriceValid =
        close >= invalidBuyLow;

    const recoveryConfirmed =
        waitingRecovery &&
        recoveryPrice !== null &&
        high >= recoveryPrice &&
        bullishCandle &&
        buyPriceValid &&
        touchIndex >= 0;

    // =================================================
    // STATUS
    // =================================================

    let status = "NORMAL";

    if (recoveryConfirmed) {

        status = "BUY";

    } else if (dump) {

        status = "DUMP";

    } else if (tooFarBelow) {

        status = "POC LOST";

    } else if (waitingRecovery) {

        status = "WAIT / RECOVERY";

    } else if (insideRedZone) {

        status = "AREA MERAH";

    } else if (belowRedZone) {

        status = "DI BAWAH POC";

    } else if (aboveRedZone) {

        status = "DI ATAS POC";
    }

    // =================================================
    // SIGNAL
    // =================================================

    let signal = "WAIT";

    if (recoveryConfirmed) {

        signal = "BUY";

    } else if (dump) {

        signal = "DUMP";

    } else if (tooFarBelow) {

        signal = "POC LOST";

    } else if (waitingRecovery) {

        signal = "WAIT";

    } else if (insideRedZone) {

        signal = "AREA MERAH";
    }

    // =================================================
    // BUY VALIDATION TEXT
    // =================================================

    let validation = "WAIT";

    if (tooFarBelow) {

        validation =
            "INVALID / TERLALU JAUH";

    } else if (recoveryConfirmed) {

        validation =
            "BUY VALID";

    } else if (waitingRecovery) {

        validation =
            "MENUNGGU RECOVERY";

    } else if (insideRedZone) {

        validation =
            "VALID AREA";
    }

    // =================================================
    // SIGNAL SCORE
    // =================================================
    //
    // Bukan probabilitas profit.
    // Hanya skor kondisi scanner.
    // =================================================

    let score = 0;

    if (insideRedZone) {
        score += 20;
    }

    if (volumeData.volumeSpike) {
        score += 20;
    }

    if (volumeData.bullishCandle) {
        score += 20;
    }

    if (waitingRecovery) {
        score += 20;
    }

    if (recoveryConfirmed) {
        score += 20;
    }

    if (tooFarBelow) {
        score = 0;
    }

    // =================================================
    // HASIL
    // =================================================

    return {

        status,
        signal,
        validation,
        score,

        // Harga
        close,
        pocPrice,

        // Red zone
        redZoneLow,
        redZoneHigh,

        // Invalid area
        invalidBuyLow,

        // Recovery
        waitingRecovery,
        lowestAfterTouch,
        recoveryPrice,

        // Kondisi
        insideRedZone,
        belowRedZone,
        aboveRedZone,
        tooFarBelow,

        // Volume
        volumeRatio:
            volumeData.volumeRatio,

        volumeSpike:
            volumeData.volumeSpike,

        pressure:
            volumeData.pressure,

        dump,

        // Profile
        pocIndex,
        binSize
    };
}
