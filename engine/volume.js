// =====================================================
// MONEY STYLE SCANNER
// engine/volume.js
// =====================================================
// VOLUME ENGINE
// TIMEFRAME: 1H
//
// Disamakan dengan Pine Script:
// Money Style - Volume Spread Profile v3 Adaptive POC
// =====================================================


// =====================================================
// CALCULATE VOLUME
// =====================================================

export function calculateVolume(
    bars,
    settings
) {

    // =================================================
    // VALIDASI
    // =================================================

    if (
        !Array.isArray(bars) ||
        bars.length === 0
    ) {

        return null;

    }


    // =================================================
    // SETTINGS
    // =================================================

    const volumePeriod =
        Number(
            settings?.volumePeriod ?? 20
        );

    const volumeSpikeMult =
        Number(
            settings?.volumeSpikeMult ?? 2.0
        );


    // =================================================
    // VALIDASI PERIOD
    // =================================================

    if (
        !Number.isFinite(volumePeriod) ||
        volumePeriod <= 0
    ) {

        return null;

    }


    // =================================================
    // CANDLE TERBARU
    // =================================================
    //
    // market.js sudah mengurutkan:
    //
    // lama → baru
    //
    // Jadi candle terbaru = index terakhir.
    // =================================================

    const latest =
        bars[bars.length - 1];


    if (!latest) {

        return null;

    }


    // =================================================
    // VOLUME TERBARU
    // =================================================

    const currentVolume =
        Number(
            latest.volume
        );


    if (
        !Number.isFinite(currentVolume)
    ) {

        return null;

    }


    // =================================================
    // VOLUME PERIOD
    // =================================================
    //
    // Pine:
    //
    // averageVolume =
    //     ta.sma(
    //         srcVolume,
    //         volumePeriod
    //     )
    //
    // Artinya SMA volume dari candle terbaru
    // termasuk candle saat ini.
    // =================================================

    const startIndex =
        Math.max(
            0,
            bars.length - volumePeriod
        );


    const volumeWindow =
        bars.slice(
            startIndex
        );


    const validVolumes =
        volumeWindow
            .map(
                bar =>
                    Number(bar?.volume)
            )
            .filter(
                Number.isFinite
            );


    // =================================================
    // DATA BELUM CUKUP
    // =================================================
    //
    // Supaya sama dengan Pine ketika SMA belum
    // memiliki cukup data.
    // =================================================

    if (
        validVolumes.length <
        volumePeriod
    ) {

        return null;

    }


    // =================================================
    // AVERAGE VOLUME
    // =================================================

    const volumeSum =
        validVolumes.reduce(
            (
                total,
                value
            ) =>
                total + value,
            0
        );


    const averageVolume =
        volumeSum /
        validVolumes.length;


    // =================================================
    // VOLUME RATIO
    // =================================================
    //
    // Pine:
    //
    // volumeRatio =
    //     averageVolume > 0 ?
    //     srcVolume / averageVolume :
    //     0.0
    // =================================================

    const volumeRatio =
        averageVolume > 0
            ? currentVolume /
              averageVolume
            : 0;


    // =================================================
    // VOLUME SPIKE
    // =================================================
    //
    // Pine:
    //
    // volumeSpike =
    //     volumeRatio >= volumeSpikeMult
    // =================================================

    const volumeSpike =
        volumeRatio >=
        volumeSpikeMult;


    // =================================================
    // CANDLE DIRECTION
    // =================================================

    const open =
        Number(
            latest.open
        );

    const close =
        Number(
            latest.close
        );


    const bullishCandle =
        Number.isFinite(open) &&
        Number.isFinite(close) &&
        close > open;


    const bearishCandle =
        Number.isFinite(open) &&
        Number.isFinite(close) &&
        close < open;


    // =================================================
    // POC
    // =================================================
    //
    // POC berasal dari engine/profile.js.
    //
    // Volume engine tidak menghitung ulang POC.
    // =================================================

    const profile =
        arguments.length >= 3
            ? arguments[2]
            : null;


    const pocPrice =
        Number(
            profile?.pocPrice
        );


    // =================================================
    // DUMP
    // =================================================
    //
    // Pine:
    //
    // dump =
    //     validRange and
    //     bearishCandle and
    //     volumeSpike and
    //     srcClose <= pocPrice
    //
    // Di sini validRange direpresentasikan oleh
    // POC yang valid.
    // =================================================

    const dump =
        Number.isFinite(pocPrice) &&
        bearishCandle &&
        volumeSpike &&
        close <= pocPrice;


    // =================================================
    // PRESSURE
    // =================================================

    let pressure =
        "NORMAL";


    if (dump) {

        pressure =
            "HIGH / DUMP";

    }

    else if (volumeSpike) {

        pressure =
            "HIGH";

    }


    // =================================================
    // RETURN
    // =================================================

    return {

        // ---------------------------------------------
        // BASIC
        // ---------------------------------------------

        currentVolume,

        averageVolume,

        volumeRatio,

        volumeSpike,

        volumePeriod,

        volumeSpikeMult,


        // ---------------------------------------------
        // CANDLE
        // ---------------------------------------------

        bullishCandle,

        bearishCandle,


        // ---------------------------------------------
        // POC / PRESSURE
        // ---------------------------------------------

        pocPrice:
            Number.isFinite(pocPrice)
                ? pocPrice
                : null,

        dump,

        pressure,


        // ---------------------------------------------
        // META
        // ---------------------------------------------

        timeframe:
            "1H"

    };

}
