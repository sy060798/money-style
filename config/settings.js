// =====================================================
// MONEY STYLE SCANNER
// config/settings.js
// =====================================================

export const SETTINGS = {

    // =================================================
    // PROFILE
    // =================================================

    // Jumlah candle yang digunakan untuk profile.
    lookback: 150,

    // Jumlah candle terbaru yang digunakan untuk
    // menghitung POC / volume profile.
    pocLookback: 50,

    // Jumlah price bins.
    bins: 30,

    // Value Area.
    valueAreaPercent: 70,


    // =================================================
    // VOLUME
    // =================================================

    // Rata-rata volume dari 20 candle.
    volumePeriod: 20,

    // Volume >= 2x rata-rata = volume spike.
    volumeSpikeMult: 2.0,


    // =================================================
    // BUY CONFIRMATION
    // =================================================

    // Jarak konfirmasi dari low recovery.
    confirmTicks: 1,

    // Tick size saham.
    //
    // Untuk sementara 0.01.
    // Nanti bisa disesuaikan dengan aturan tick
    // harga saham Indonesia.
    tickSize: 0.01,


    // =================================================
    // RED ZONE
    // =================================================

    // Jumlah bin di sekitar POC.
    redZoneBins: 1,


    // =================================================
    // BUY INVALIDATION
    // =================================================

    // Jarak maksimum di bawah Red Zone.
    maxDistanceBins: 2,


    // =================================================
    // MARKET DATA
    // =================================================

    // Jumlah candle yang diminta dari Worker / Zapi.
    //
    // Harus >= lookback.
    candleLimit: 150,

    // Data harian.
    interval: "1d",


    // =================================================
    // SCANNER
    // =================================================

    // Maksimal saham yang diproses sekali scan.
    maxStocks: 5,


    // =================================================
    // REFRESH
    // =================================================

    // Refresh setiap 60 detik.
    refreshInterval:
        60 * 1000
};
