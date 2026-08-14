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

    // =================================================
    // VALIDASI
    // =================================================

    if (
        !Array.isArray(candles) ||
        candles.length === 0 ||
        !profile ||
        !volumeData
    ) {
        return null;
    }


    // =================================================
    // SETTINGS
    // =================================================

    const redZoneBins =
        Number(settings.redZoneBins ?? 1);

    const maxDistanceBins =
        Number(settings.maxDistanceBins ?? 2);

    const confirmTicks =
        Number(settings.confirmTicks ?? 1);

    const tickSize =
        Number(settings.tickSize ?? 0.01);


    if (
        !Number.isFinite(redZoneBins) ||
        !Number.isFinite(maxDistanceBins) ||
        !Number.isFinite(confirmTicks) ||
        !Number.isFinite(tickSize) ||
        tickSize <= 0
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
    // Signal membutuhkan:
    // terlama -> terbaru
    //
    // Supaya recovery dihitung secara kronologis.
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
                    !Number.isFinite(close)
                ) {
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
    // URUTKAN:
    // TERLAMA -> TERBARU
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
    // DATA TERBARU
    // =================================================

    const current =
        normalizedCandles[
            normalizedCandles.length - 1
        ];


    const close =
        current.close;

    const high =
        current.high;

    const low =
        current.low;

    const open =
        current.open;


    // =================================================
    // PROFILE
    // =================================================

    const profileLow =
        Number(profile.profileLow);

    const binSize =
        Number(profile.binSize);

    const pocIndex =
        Number(profile.pocIndex);

    const pocPrice =
        Number(profile.pocPrice);


    if (
        !Number.isFinite(profileLow) ||
        !Number.isFinite(binSize) ||
        binSize <= 0 ||
        !Number.isFinite(pocIndex) ||
        !Number.isFinite(pocPrice)
    ) {
        return null;
    }


    // =================================================
    // JUMLAH BIN
    // =================================================

    const profileBins =
        Number(
            profile.bins ??
            profile.volumeBins?.length ??
            30
        );


    if (
        !Number.isFinite(profileBins) ||
        profileBins < 1
    ) {
        return null;
    }


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
            profileBins - 1,
            pocIndex +
            redZoneBins
        );


    const redZoneLow =
        profileLow +
        redLowIndex *
        binSize;


    const redZoneHigh =
        profileLow +
        (redHighIndex + 1) *
        binSize;


    // =================================================
    // INVALID BUY AREA
    // =================================================

    const invalidIndex =
        Math.max(
            0,
            redLowIndex -
            maxDistanceBins
        );


    const invalidBuyLow =
        profileLow +
        invalidIndex *
        binSize;


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
    // VOLUME
    // =================================================

    const volumeSpike =
        Boolean(
            volumeData.volumeSpike
        );


    const volumeBullishCandle =
        Boolean(
            volumeData.bullishCandle
        );


    const volumeRatio =
        Number.isFinite(
            Number(volumeData.volumeRatio)
        )
            ? Number(volumeData.volumeRatio)
            : 0;


    const pressure =
        volumeData.pressure ??
        "NORMAL";


    // =================================================
    // DUMP
    // =================================================

    const dump =
        volumeSpike &&
        bearishCandle &&
        close <= pocPrice;


    // =================================================
    // RECOVERY
    // =================================================
    //
    // Urutan candle sudah:
    //
    // TERLAMA -> TERBARU
    //
    // Jadi state recovery bisa dihitung dengan benar.
    // =================================================

    let waitingRecovery =
        false;

    let lowestAfterTouch =
        null;

    let touchIndex =
        -1;


    for (
        let i = 0;
        i < normalizedCandles.length;
        i++
    ) {

        const candle =
            normalizedCandles[i];


        const cHigh =
            candle.high;

        const cLow =
            candle.low;

        const cClose =
            candle.close;


        // ---------------------------------------------
        // CEK CANDLE MENYENTUH RED ZONE
        // ---------------------------------------------

        const candleInsideZone =
            cLow <= redZoneHigh &&
            cHigh >= redZoneLow;


        // ---------------------------------------------
        // CEK TERLALU JAUH
        // ---------------------------------------------

        const candleTooFarBelow =
            cClose < invalidBuyLow;


        // ---------------------------------------------
        // POC LOST
        // ---------------------------------------------

        if (
            waitingRecovery &&
            candleTooFarBelow
        ) {

            waitingRecovery =
                false;

            lowestAfterTouch =
                null;

            touchIndex =
                -1;
        }


        // ---------------------------------------------
        // TOUCH RED ZONE
        // ---------------------------------------------

        if (
            candleInsideZone &&
            !waitingRecovery &&
            !candleTooFarBelow
        ) {

            waitingRecovery =
                true;

            lowestAfterTouch =
                cLow;

            touchIndex =
                i;
        }


        // ---------------------------------------------
        // UPDATE LOW
        // ---------------------------------------------

        if (waitingRecovery) {

            if (
                lowestAfterTouch === null
            ) {

                lowestAfterTouch =
                    cLow;

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

    let recoveryPrice =
        null;


    if (
        waitingRecovery &&
        lowestAfterTouch !== null
    ) {

        recoveryPrice =
            lowestAfterTouch +
            confirmTicks *
            tickSize;
    }


    // =================================================
    // BUY PRICE VALIDATION
    // =================================================

    const buyPriceValid =
        close >= invalidBuyLow;


    // =================================================
    // RECOVERY CONFIRMATION
    // =================================================

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

    let status =
        "NORMAL";


    if (recoveryConfirmed) {

        status =
            "BUY";

    } else if (dump) {

        status =
            "DUMP";

    } else if (tooFarBelow) {

        status =
            "POC LOST";

    } else if (waitingRecovery) {

        status =
            "WAIT / RECOVERY";

    } else if (insideRedZone) {

        status =
            "AREA MERAH";

    } else if (belowRedZone) {

        status =
            "DI BAWAH POC";

    } else if (aboveRedZone) {

        status =
            "DI ATAS POC";
    }


    // =================================================
    // SIGNAL
    // =================================================

    let signal =
        "WAIT";


    if (recoveryConfirmed) {

        signal =
            "BUY";

    } else if (dump) {

        signal =
            "DUMP";

    } else if (tooFarBelow) {

        signal =
            "POC LOST";

    } else if (waitingRecovery) {

        signal =
            "WAIT";

    } else if (insideRedZone) {

        signal =
            "AREA MERAH";
    }


    // =================================================
    // BUY VALIDATION TEXT
    // =================================================

    let validation =
        "WAIT";


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

    let score =
        0;


    if (insideRedZone) {
        score += 20;
    }


    if (volumeSpike) {
        score += 20;
    }


    if (volumeBullishCandle) {
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

        // ---------------------------------------------
        // SIGNAL
        // ---------------------------------------------

        status,

        signal,

        validation,

        score,


        // ---------------------------------------------
        // CURRENT PRICE
        // ---------------------------------------------

        close,

        open,

        high,

        low,


        // ---------------------------------------------
        // PROFILE
        // ---------------------------------------------

        pocPrice,

        pocIndex,

        binSize,


        // ---------------------------------------------
        // RED ZONE
        // ---------------------------------------------

        redLowIndex,

        redHighIndex,

        redZoneLow,

        redZoneHigh,


        // ---------------------------------------------
        // INVALID AREA
        // ---------------------------------------------

        invalidIndex,

        invalidBuyLow,


        // ---------------------------------------------
        // RECOVERY
        // ---------------------------------------------

        waitingRecovery,

        lowestAfterTouch,

        recoveryPrice,

        touchIndex,


        // ---------------------------------------------
        // KONDISI HARGA
        // ---------------------------------------------

        insideRedZone,

        belowRedZone,

        aboveRedZone,

        tooFarBelow,


        // ---------------------------------------------
        // CANDLE
        // ---------------------------------------------

        bullishCandle,

        bearishCandle,


        // ---------------------------------------------
        // VOLUME
        // ---------------------------------------------

        volumeRatio,

        volumeSpike,

        pressure,

        dump,


        // ---------------------------------------------
        // META
        // ---------------------------------------------

        candleCount:
            normalizedCandles.length,

        latestDate:
            current.date ?? null
    };
}
