// =====================================================
// MONEY STYLE SCANNER
// engine/signal.js
// =====================================================
// SIGNAL ENGINE
// TIMEFRAME: 1H
//
// Logic mengikuti Pine Script:
// Money Style - Volume Spread Profile v3 Adaptive POC
// =====================================================


// =====================================================
// CALCULATE SIGNAL
// =====================================================

export function calculateSignal(
    bars,
    profile,
    volume,
    settings
) {

    // =================================================
    // VALIDASI DATA
    // =================================================

    if (
        !Array.isArray(bars) ||
        bars.length === 0
    ) {

        return null;

    }


    if (!profile) {

        return null;

    }


    if (!volume) {

        return null;

    }


    // =================================================
    // SETTINGS
    // =================================================

    const confirmTicks =
        Number(
            settings?.confirmTicks ?? 1
        );

    const tickSize =
        Number(
            settings?.tickSize ?? 0.01
        );

    const maxDistanceBins =
        Number(
            settings?.maxDistanceBins ?? 2
        );


    // =================================================
    // LATEST CANDLE
    // =================================================
    //
    // market.js:
    //
    // lama → baru
    //
    // Jadi candle terbaru berada di index terakhir.
    // =================================================

    const latest =
        bars[bars.length - 1];


    if (!latest) {

        return null;

    }


    const open =
        Number(
            latest.open
        );

    const high =
        Number(
            latest.high
        );

    const low =
        Number(
            latest.low
        );

    const close =
        Number(
            latest.close
        );


    if (
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
    ) {

        return null;

    }


    // =================================================
    // PROFILE DATA
    // =================================================

    const pocPrice =
        Number(
            profile.pocPrice
        );

    const redZoneLow =
        Number(
            profile.redZoneLow
        );

    const redZoneHigh =
        Number(
            profile.redZoneHigh
        );

    const binSize =
        Number(
            profile.binSize
        );


    if (
        !Number.isFinite(pocPrice) ||
        !Number.isFinite(redZoneLow) ||
        !Number.isFinite(redZoneHigh)
    ) {

        return null;

    }


    // =================================================
    // BULLISH / BEARISH
    // =================================================

    const bullishCandle =
        close > open;

    const bearishCandle =
        close < open;


    // =================================================
    // RED ZONE
    // =================================================
    //
    // Pine:
    //
    // insideRedZone =
    //     low <= redZoneHigh and
    //     high >= redZoneLow
    // =================================================

    const insideRedZone =
        low <= redZoneHigh &&
        high >= redZoneLow;


    // =================================================
    // POSITION
    // =================================================

    const belowRedZone =
        close < redZoneLow;

    const aboveRedZone =
        close > redZoneHigh;


    // =================================================
    // INVALID BUY LOW
    // =================================================
    //
    // Pine:
    //
    // invalidBuyLow =
    //     profileLow +
    //     max(
    //         0,
    //         redLowIndex - maxDistanceBins
    //     ) * binSize
    //
    // Profile engine sudah menghitung nilai ini.
    // =================================================

    let invalidBuyLow =
        Number(
            profile.invalidBuyLow
        );


    // -------------------------------------------------
    // FALLBACK
    // -------------------------------------------------

    if (
        !Number.isFinite(invalidBuyLow)
    ) {

        if (
            Number.isFinite(
                profile.redZoneLow
            ) &&
            Number.isFinite(binSize)
        ) {

            invalidBuyLow =
                redZoneLow -
                (
                    maxDistanceBins *
                    binSize
                );

        }

    }


    // =================================================
    // TOO FAR BELOW
    // =================================================

    const tooFarBelow =
        Number.isFinite(invalidBuyLow) &&
        close < invalidBuyLow;


    // =================================================
    // BUY PRICE VALID
    // =================================================

    const buyPriceValid =
        !Number.isFinite(invalidBuyLow) ||
        close >= invalidBuyLow;


    // =================================================
    // VOLUME DATA
    // =================================================

    const volumeSpike =
        Boolean(
            volume.volumeSpike
        );

    const dump =
        Boolean(
            volume.dump
        );


    // =================================================
    // RECOVERY STATE
    // =================================================
    //
    // Pine menggunakan:
    //
    // waitingRecovery
    // lowestAfterTouch
    // touchBar
    //
    // Karena scanner JS melakukan scan ulang,
    // state disimpan per ticker.
    // =================================================

    const ticker =
        String(
            latest.ticker ??
            profile.ticker ??
            ""
        ).toUpperCase();


    // =================================================
    // STATE STORAGE
    // =================================================

    if (
        !globalThis.__moneyStyleSignalState
    ) {

        globalThis.__moneyStyleSignalState =
            new Map();

    }


    const stateMap =
        globalThis.__moneyStyleSignalState;


    // -------------------------------------------------
    // Gunakan ticker dari profile jika tersedia.
    // -------------------------------------------------

    const stateKey =
        ticker ||
        String(
            profile.symbol ||
            "UNKNOWN"
        ).toUpperCase();


    let state =
        stateMap.get(
            stateKey
        );


    if (!state) {

        state = {

            waitingRecovery:
                false,

            lowestAfterTouch:
                null,

            touchBar:
                null

        };

    }


    // =================================================
    // BAR INDEX
    // =================================================

    const currentBarIndex =
        bars.length - 1;


    // =================================================
    // RESET PROFILE INVALID
    // =================================================

    const validRange =
        Number.isFinite(
            profile.profileHigh
        ) &&
        Number.isFinite(
            profile.profileLow
        ) &&
        Number.isFinite(
            profile.binSize
        ) &&
        profile.binSize > 0;


    if (!validRange) {

        state.waitingRecovery =
            false;

        state.lowestAfterTouch =
            null;

        state.touchBar =
            null;

    }


    // =================================================
    // RESET JIKA TERLALU JAUH
    // =================================================

    if (
        state.waitingRecovery &&
        tooFarBelow
    ) {

        state.waitingRecovery =
            false;

        state.lowestAfterTouch =
            null;

        state.touchBar =
            null;

    }


    // =================================================
    // NEW TOUCH
    // =================================================
    //
    // Pine:
    //
    // newTouch =
    //     validRange and
    //     insideRedZone and
    //     not waitingRecovery and
    //     not tooFarBelow
    // =================================================

    const newTouch =
        validRange &&
        insideRedZone &&
        !state.waitingRecovery &&
        !tooFarBelow;


    if (newTouch) {

        state.waitingRecovery =
            true;

        state.lowestAfterTouch =
            low;

        state.touchBar =
            currentBarIndex;

    }


    // =================================================
    // UPDATE LOWEST
    // =================================================

    if (
        state.waitingRecovery
    ) {

        if (
            !Number.isFinite(
                state.lowestAfterTouch
            )
        ) {

            state.lowestAfterTouch =
                low;

        }

        else {

            state.lowestAfterTouch =
                Math.min(
                    state.lowestAfterTouch,
                    low
                );

        }

    }


    // =================================================
    // TICK MOVE
    // =================================================

    const tickMove =
        confirmTicks *
        tickSize;


    // =================================================
    // RECOVERY PRICE
    // =================================================

    const recoveryPrice =
        Number.isFinite(
            state.lowestAfterTouch
        )
            ? state.lowestAfterTouch +
              tickMove
            : null;


    // =================================================
    // BUY SIGNAL
    // =================================================
    //
    // Pine:
    //
    // buySignal =
    //     waitingRecovery and
    //     not na(lowestAfterTouch) and
    //     high >= recoveryPrice and
    //     bullishCandle and
    //     buyPriceValid and
    //     bar_index >= touchBar
    // =================================================

    const buySignal =
        state.waitingRecovery &&
        Number.isFinite(
            state.lowestAfterTouch
        ) &&
        Number.isFinite(
            recoveryPrice
        ) &&
        high >= recoveryPrice &&
        bullishCandle &&
        buyPriceValid &&
        (
            !Number.isFinite(
                state.touchBar
            ) ||
            currentBarIndex >=
                state.touchBar
        );


    // =================================================
    // RESET AFTER BUY
    // =================================================

    if (buySignal) {

        state.waitingRecovery =
            false;

        state.lowestAfterTouch =
            null;

        state.touchBar =
            null;

    }


    // =================================================
    // SAVE STATE
    // =================================================

    stateMap.set(
        stateKey,
        state
    );


    // =================================================
    // STATUS
    // =================================================

    let status =
        "NORMAL";


    if (buySignal) {

        status =
            "BUY";

    }

    else if (dump) {

        status =
            "DUMP";

    }

    else if (tooFarBelow) {

        status =
            "POC LOST";

    }

    else if (
        state.waitingRecovery
    ) {

        status =
            "WAIT / RECOVERY";

    }

    else if (insideRedZone) {

        status =
            "AREA MERAH";

    }

    else if (belowRedZone) {

        status =
            "DI BAWAH POC";

    }

    else if (aboveRedZone) {

        status =
            "DI ATAS POC";

    }


    // =================================================
    // SIGNAL
    // =================================================

    let signal =
        "WAIT";


    if (buySignal) {

        signal =
            "BUY";

    }

    else if (dump) {

        signal =
            "DUMP";

    }

    else if (tooFarBelow) {

        signal =
            "POC LOST";

    }

    else if (
        state.waitingRecovery
    ) {

        signal =
            "WAIT";

    }

    else if (insideRedZone) {

        signal =
            "AREA MERAH";

    }


    // =================================================
    // BUY VALIDATION
    // =================================================

    let validation =
        "WAIT";


    if (buySignal) {

        validation =
            "BUY VALID";

    }

    else if (tooFarBelow) {

        validation =
            "INVALID / TERLALU JAUH";

    }

    else if (
        state.waitingRecovery
    ) {

        validation =
            "MENUNGGU RECOVERY";

    }

    else if (insideRedZone) {

        validation =
            "VALID AREA";

    }


    // =================================================
    // SCORE
    // =================================================
    //
    // Pine tidak menggunakan score.
    //
    // Score hanya untuk kompatibilitas UI app.js.
    // Tidak mempengaruhi BUY.
    // =================================================

    let score =
        0;


    if (insideRedZone) {

        score += 25;

    }

    if (
        state.waitingRecovery
    ) {

        score += 25;

    }

    if (bullishCandle) {

        score += 15;

    }

    if (volumeSpike) {

        score += 15;

    }

    if (buyPriceValid) {

        score += 10;

    }

    if (buySignal) {

        score =
            100;

    }


    if (
        dump ||
        tooFarBelow
    ) {

        score =
            0;

    }


    // =================================================
    // RETURN
    // =================================================

    return {

        // ---------------------------------------------
        // SIGNAL
        // ---------------------------------------------

        signal,

        status,

        validation,

        score,


        // ---------------------------------------------
        // BUY
        // ---------------------------------------------

        buySignal,

        buyPriceValid,

        recoveryPrice,

        lowestAfterTouch:
            state.lowestAfterTouch,

        waitingRecovery:
            state.waitingRecovery,


        // ---------------------------------------------
        // POSITION
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

        volumeSpike,

        dump,


        // ---------------------------------------------
        // PROFILE
        // ---------------------------------------------

        pocPrice,

        redZoneLow,

        redZoneHigh,

        invalidBuyLow,


        // ---------------------------------------------
        // RECOVERY
        // ---------------------------------------------

        confirmTicks,

        tickSize,

        touchBar:
            state.touchBar,


        // ---------------------------------------------
        // META
        // ---------------------------------------------

        timeframe:
            "1H"

    };

}


// =====================================================
// CLEAR SIGNAL STATE
// =====================================================
//
// Dipakai kalau mau reset seluruh state scanner.
// =====================================================

export function clearSignalState() {

    if (
        globalThis.__moneyStyleSignalState
    ) {

        globalThis.__moneyStyleSignalState.clear();

    }

}
