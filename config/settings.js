// =====================================================
// MONEY STYLE SCANNER
// config/settings.js
// =====================================================

export const SETTINGS = {

    // =================================================
    // PROFILE
    // =================================================

    // Jumlah candle untuk menghitung profile.
    lookback: 150,

    // Jumlah candle terbaru untuk Volume Profile / POC.
    pocLookback: 50,

    // Jumlah price bins.
    bins: 30,

    // Persentase volume untuk Value Area.
    valueAreaPercent: 70,


    // =================================================
    // VOLUME
    // =================================================

    // Periode rata-rata volume.
    volumePeriod: 20,

    // Volume >= 2x rata-rata = volume spike.
    volumeSpikeMult: 2.0,


    // =================================================
    // BUY CONFIRMATION
    // =================================================

    // Jumlah tick di atas low recovery.
    confirmTicks: 1,

    // Tick size default.
    //
    // Catatan:
    // Untuk tahap scanner ini digunakan 0.01.
    // Kalau nanti ingin mengikuti tick size IDX
    // berdasarkan kelompok harga, bisa dibuat
    // dinamis.
    tickSize: 0.01,


    // =================================================
    // RED ZONE
    // =================================================

    // Jumlah bin di atas/bawah POC.
    redZoneBins: 1,


    // =================================================
    // BUY INVALIDATION
    // =================================================

    // Maksimal jarak bin di bawah Red Zone.
    maxDistanceBins: 2,


    // =================================================
    // MARKET DATA
    // =================================================

    // Jumlah candle yang diminta dari Worker.
    //
    // Worker:
    // ?code=BBCA&length=150
    //
    // Harus >= lookback.
    candleLimit: 150,

    // Interval data.
    interval: "1d",


    // =================================================
    // SCANNER
    // =================================================

    // Maksimal ticker yang diproses sekali scan.
    maxStocks: 5,


    // =================================================
    // CACHE
    // =================================================

    // Cache market data di browser.
    cacheDuration:
        30 * 1000,


    // =================================================
    // REFRESH
    // =================================================

    // Refresh otomatis setiap 60 detik.
    refreshInterval:
        60 * 1000

};
