// =====================================================
// MONEY STYLE SCANNER
// config/settings.js
// =====================================================

export const SETTINGS = {

    // =================================================
    // PROFILE
    // =================================================

    // Jumlah candle untuk menghitung profile.
    //
    // TIMEFRAME 1H:
    // 150 candle = konteks sekitar 150 jam trading.
    //
    lookback:
        150,


    // =================================================
    // POC AKTIF
    // =================================================

    // Jumlah candle terbaru yang digunakan
    // untuk menghitung Volume Profile / POC aktif.
    //
    // Sesuai Pine Script:
    // pocLookback = 50
    //
    pocLookback:
        50,


    // =================================================
    // PRICE BINS
    // =================================================

    // Jumlah level harga dalam profile.
    //
    // Sesuai Pine Script:
    // bins = 30
    //
    bins:
        30,


    // =================================================
    // VALUE AREA
    // =================================================

    // Persentase volume untuk Value Area.
    //
    // Sesuai Pine Script:
    // valueAreaPercent = 70
    //
    valueAreaPercent:
        70,


    // =================================================
    // VOLUME
    // =================================================

    // Periode rata-rata volume.
    //
    // Pine:
    // ta.sma(volume, 20)
    //
    volumePeriod:
        20,


    // Volume >= 2x rata-rata = volume spike.
    //
    // Pine:
    // volumeRatio >= 2.0
    //
    volumeSpikeMult:
        2.0,


    // =================================================
    // BUY CONFIRMATION
    // =================================================

    // Jumlah tick recovery.
    //
    // Pine:
    // confirmTicks = 1
    //
    confirmTicks:
        1,


    // =================================================
    // TICK SIZE
    // =================================================

    // Default tick size.
    //
    // Untuk scanner JS sementara menggunakan 0.01.
    //
    // Catatan:
    // Pine menggunakan:
    //
    // syminfo.mintick
    //
    // Jadi nanti bisa dibuat dinamis berdasarkan
    // harga saham / aturan tick IDX jika diperlukan.
    //
    tickSize:
        0.01,


    // =================================================
    // RED ZONE
    // =================================================

    // Jumlah bin di atas dan bawah POC.
    //
    // Pine:
    // redZoneBins = 1
    //
    redZoneBins:
        1,


    // =================================================
    // BUY INVALIDATION
    // =================================================

    // Maksimal jarak harga di bawah Red Zone
    // sebelum setup recovery dianggap batal.
    //
    // Pine:
    // maxDistanceBins = 2
    //
    maxDistanceBins:
        2,


    // =================================================
    // MARKET DATA
    // =================================================

    // =================================================
    // TIMEFRAME
    // =================================================
    //
    // SCANNER DIKUNCI KE 1 JAM.
    //
    // Jangan gunakan "1d".
    //
    // Market.js harus meneruskan timeframe ini
    // ke Worker / endpoint Zapi.
    //
    interval:
        "1h",


    // Nama timeframe yang lebih eksplisit untuk
    // digunakan oleh engine / metadata.
    //
    timeframe:
        "1H",


    // =================================================
    // CANDLE LIMIT
    // =================================================
    //
    // Jumlah candle 1H yang diminta.
    //
    // Harus >= lookback.
    //
    candleLimit:
        150,


    // =================================================
    // SCANNER
    // =================================================

    // Maksimal ticker yang diproses dalam satu scan.
    //
    maxStocks:
        5,


    // =================================================
    // CACHE
    // =================================================

    // Cache market data browser.
    //
    // 30 detik.
    //
    cacheDuration:
        30 * 1000,


    // =================================================
    // REFRESH
    // =================================================

    // Refresh otomatis scanner.
    //
    // 60 detik.
    //
    refreshInterval:
        60 * 1000

};
