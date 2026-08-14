// =====================================================
// MONEY STYLE SCANNER
// engine/profile.js
// =====================================================

export function calculateProfile(bars, settings = {}) {

    // =====================================================
    // SETTINGS
    // =====================================================

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
    // VALIDASI SETTINGS
    // =====================================================

    if (!Array.isArray(bars)) {
        throw new Error(
            "Profile: bars bukan array"
        );
    }

    if (bars.length === 0) {
        throw new Error(
            "Profile: data candle kosong"
        );
    }

    if (
        !Number.isFinite(lookback) ||
        lookback < 1
    ) {
        throw new Error(
            "Profile: lookback tidak valid"
        );
    }

    if (
        !Number.isFinite(pocLookback) ||
        pocLookback < 1
    ) {
        throw new Error(
            "Profile: pocLookback tidak valid"
        );
    }

    if (
        !Number.isFinite(bins) ||
        bins < 1
    ) {
        throw new Error(
            "Profile: bins tidak valid"
        );
    }

    if (
        !Number.isFinite(valueAreaPercent) ||
        valueAreaPercent <= 0 ||
        valueAreaPercent > 100
    ) {
        throw new Error(
            "Profile: valueAreaPercent tidak valid"
        );
    }


    // =====================================================
    // SINKRONISASI DATA ZAPI
    // =====================================================
    //
    // Zapi:
    //
    // data.items = [
    //   {
    //     date,
    //     open,
    //     high,
    //     low,
    //     close,
    //     volume
    //   }
    // ]
    //
    // Fungsi ini juga menerima array bars biasa.
    // =====================================================

    const normalizedBars =
        bars
            .map((bar) => {

                if (!bar) {
                    return null;
                }

                const date =
                    bar.date ?? null;

                const open =
                    Number(bar.open);

                const high =
                    Number(bar.high);

                const low =
                    Number(bar.low);

                const close =
                    Number(bar.close);

                const volume =
                    Number(bar.volume);


                // -----------------------------------------
                // VALIDASI OHLCV
                // -----------------------------------------

                if (
                    !Number.isFinite(high) ||
                    !Number.isFinite(low) ||
                    !Number.isFinite(close) ||
                    !Number.isFinite(volume)
                ) {
                    return null;
                }

                if (high < low) {
                    return null;
                }

                if (volume < 0) {
                    return null;
                }


                return {
                    date,
                    open,
                    high,
                    low,
                    close,
                    volume
                };
            })
            .filter(Boolean);


    if (normalizedBars.length === 0) {
        throw new Error(
            "Profile: tidak ada candle OHLCV valid"
        );
    }


    // =====================================================
    // URUTAN CANDLE
    // =====================================================
    //
    // Zapi mengirim:
    //
    // terbaru -> terlama
    //
    // Kita pertahankan urutan terbaru dahulu karena
    // lookback mengambil candle terbaru.
    //
    // Kalau data ternyata tidak punya date, urutan asli
    // tetap dipertahankan.
    // =====================================================

    const hasDates =
        normalizedBars.every(
            bar => Boolean(bar.date)
        );


    if (hasDates) {

        normalizedBars.sort(
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

                // terbaru -> terlama
                return timeB - timeA;
            }
        );
    }


    // =====================================================
    // PROFILE BARS
    // =====================================================

    const profileBars =
        normalizedBars.slice(
            0,
            Math.min(
                Math.floor(lookback),
                normalizedBars.length
            )
        );


    // =====================================================
    // POC BARS
    // =====================================================

    const pocBars =
        normalizedBars.slice(
            0,
            Math.min(
                Math.floor(pocLookback),
                normalizedBars.length
            )
        );


    // =====================================================
    // HIGH / LOW PROFILE
    // =====================================================

    let profileHigh =
        -Infinity;

    let profileLow =
        Infinity;


    for (const bar of profileBars) {

        const high =
            bar.high;

        const low =
            bar.low;


        if (high > profileHigh) {
            profileHigh =
                high;
        }


        if (low < profileLow) {
            profileLow =
                low;
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
        profileHigh -
        profileLow;


    if (priceRange <= 0) {
        throw new Error(
            "Profile: price range = 0"
        );
    }


    // =====================================================
    // BIN SIZE
    // =====================================================

    const binSize =
        priceRange /
        bins;


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
            bar.close;

        const volume =
            bar.volume;


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


        // -----------------------------------------------
        // BOUNDARY
        // -----------------------------------------------

        if (index < 0) {
            index = 0;
        }


        if (index >= bins) {
            index =
                bins - 1;
        }


        volumeBins[index] +=
            volume;
    }


    // =====================================================
    // TOTAL VOLUME
    // =====================================================

    let totalVolume =
        0;


    for (
        const volume of volumeBins
    ) {
        totalVolume +=
            volume;
    }


    if (totalVolume <= 0) {
        throw new Error(
            "Profile: total volume = 0"
        );
    }


    // =====================================================
    // CARI POC
    // =====================================================

    let pocIndex =
        0;

    let pocVolume =
        volumeBins[0];


    for (
        let i = 1;
        i < bins;
        i++
    ) {

        if (
            volumeBins[i] >
            pocVolume
        ) {

            pocVolume =
                volumeBins[i];

            pocIndex =
                i;
        }
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
        pocIndex *
        binSize;


    const pocHigh =
        pocLow +
        binSize;


    const pocPrice =
        (
            pocLow +
            pocHigh
        ) / 2;


    // =====================================================
    // VAH / VAL
    // =====================================================
    //
    // Harga asli.
    // Bukan persentase.
    // =====================================================

    const valueAreaLow =
        profileLow +
        valueLowIndex *
        binSize;


    const valueAreaHigh =
        profileLow +
        (valueHighIndex + 1) *
        binSize;


    // =====================================================
    // RED ZONE
    // =====================================================

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
        (redHighIndex + 1) *
        binSize;


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
        invalidBuyLowIndex *
        binSize;


    // =====================================================
    // PROFILE STRENGTH
    // =====================================================

    let maxProfileVolume =
        0;


    for (
        const volume of volumeBins
    ) {

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
            (
                pocPrice -
                profileLow
            ) /
            priceRange
        ) * 100;


    // =====================================================
    // PROFILE STRENGTH
    // =====================================================

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

        // -----------------------------------------------
        // DATA
        // -----------------------------------------------

        bars:
            normalizedBars,

        profileBars,

        pocBars,


        // -----------------------------------------------
        // PROFILE RANGE
        // -----------------------------------------------

        profileHigh,

        profileLow,

        priceRange,

        binSize,


        // -----------------------------------------------
        // POC
        // -----------------------------------------------

        pocIndex,

        pocVolume,

        pocPrice,


        // -----------------------------------------------
        // VALUE AREA
        // -----------------------------------------------

        valueLowIndex,

        valueHighIndex,

        valueAreaLow,

        valueAreaHigh,


        // -----------------------------------------------
        // RED ZONE
        // -----------------------------------------------

        redLowIndex,

        redHighIndex,

        redZoneLow,

        redZoneHigh,


        // -----------------------------------------------
        // INVALID BUY
        // -----------------------------------------------

        invalidBuyLow,


        // -----------------------------------------------
        // VOLUME PROFILE
        // -----------------------------------------------

        volumeBins,

        maxProfileVolume,


        // -----------------------------------------------
        // VISUAL INTERNAL
        // -----------------------------------------------

        pocPosition,

        profileStrength,


        // -----------------------------------------------
        // DATA INFO
        // -----------------------------------------------

        candleCount:
            normalizedBars.length,

        profileCandleCount:
            profileBars.length,

        pocCandleCount:
            pocBars.length,


        // -----------------------------------------------
        // SETTINGS
        // -----------------------------------------------

        lookback,

        pocLookback,

        bins,

        valueAreaPercent,

        redZoneBins,

        maxDistanceBins
    };
}
