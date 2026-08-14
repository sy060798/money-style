// =====================================================
// MONEY STYLE SCANNER
// CLOUDFLARE WORKER
// ZAPI IDX CORS PROXY
// =====================================================

const ZAPI_BASE_URL =
    "https://zpi.web.id";

const ZAPI_ENDPOINT =
    "/api/finance/idx/raw";


// =====================================================
// CORS
// =====================================================

const CORS_HEADERS = {

    "Access-Control-Allow-Origin":
        "*",

    "Access-Control-Allow-Methods":
        "GET, OPTIONS",

    "Access-Control-Allow-Headers":
        "Content-Type",

    "Access-Control-Max-Age":
        "86400"

};


// =====================================================
// JSON RESPONSE
// =====================================================

function jsonResponse(
    data,
    status = 200,
    extraHeaders = {}
) {

    return new Response(

        JSON.stringify(data),

        {
            status,

            headers: {

                ...CORS_HEADERS,

                ...extraHeaders,

                "Content-Type":
                    "application/json; charset=utf-8"

            }

        }

    );

}


// =====================================================
// TEXT RESPONSE
// =====================================================

function textResponse(
    text,
    status = 200,
    extraHeaders = {}
) {

    return new Response(

        text,

        {
            status,

            headers: {

                ...CORS_HEADERS,

                ...extraHeaders,

                "Content-Type":
                    "application/json; charset=utf-8"

            }

        }

    );

}


// =====================================================
// NORMALIZE TICKER
// =====================================================

function normalizeTicker(ticker) {

    return String(ticker || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");

}


// =====================================================
// WORKER
// =====================================================

export default {

    async fetch(
        request,
        env
    ) {

        // =================================================
        // CORS PREFLIGHT
        // =================================================

        if (
            request.method ===
            "OPTIONS"
        ) {

            return new Response(
                null,
                {
                    status: 204,
                    headers:
                        CORS_HEADERS
                }
            );

        }


        // =================================================
        // ONLY GET
        // =================================================

        if (
            request.method !==
            "GET"
        ) {

            return jsonResponse(
                {
                    error:
                        "Method not allowed"
                },
                405
            );

        }


        // =================================================
        // CHECK SECRET
        // =================================================

        const apiKey =
            env.ZAPI_API_KEY;


        if (!apiKey) {

            return jsonResponse(
                {
                    error:
                        "ZAPI_API_KEY belum dikonfigurasi di Cloudflare Worker."
                },
                500
            );

        }


        // =================================================
        // INCOMING URL
        // =================================================

        const incomingUrl =
            new URL(
                request.url
            );


        // =================================================
        // ALLOWED PARAMETERS
        // =================================================

        const path =
            incomingUrl.searchParams.get(
                "path"
            );


        const query =
            incomingUrl.searchParams.get(
                "query"
            );


        // =================================================
        // DEFAULT PATH
        // =================================================

        const finalPath =
            path ||
            "TradingSummary/GetStockSummary";


        // =================================================
        // SECURITY
        // =================================================
        //
        // Worker hanya mengizinkan endpoint IDX raw.
        // Tidak boleh digunakan untuk URL arbitrary.
        //
        // =================================================

        if (
            !finalPath ||
            finalPath.includes("://") ||
            finalPath.startsWith("/")
        ) {

            return jsonResponse(
                {
                    error:
                        "Invalid Zapi path"
                },
                400
            );

        }


        // =================================================
        // BUILD ZAPI URL
        // =================================================

        const upstreamUrl =
            new URL(
                ZAPI_ENDPOINT,
                ZAPI_BASE_URL
            );


        // path dan query dikirim sebagai
        // query parameter sesuai API Zapi.
        //
        // Contoh:
        //
        // ?path=TradingSummary/GetStockSummary
        // &query=length=1000&start=0&kodeEmiten=BBCA
        //

        upstreamUrl.searchParams.set(
            "path",
            finalPath
        );


        if (query) {

            upstreamUrl.searchParams.set(
                "query",
                query
            );

        } else {

            upstreamUrl.searchParams.set(
                "query",
                "length=1000&start=0"
            );

        }


        // =================================================
        // REQUEST KE ZAPI
        // =================================================

        let upstreamResponse;

        try {

            upstreamResponse =
                await fetch(
                    upstreamUrl.toString(),
                    {

                        method:
                            "GET",

                        headers: {

                            "Accept":
                                "application/json",

                            "Authorization":
                                `Bearer ${apiKey}`

                        }

                    }
                );

        } catch (error) {

            return jsonResponse(
                {
                    error:
                        "Gagal menghubungi Zapi",

                    message:
                        error?.message ||
                        "Network error"
                },
                502
            );

        }


        // =================================================
        // RESPONSE ZAPI
        // =================================================

        const body =
            await upstreamResponse.text();


        // =================================================
        // RETURN TO BROWSER
        // =================================================

        return textResponse(

            body,

            upstreamResponse.status,

            {
                "Cache-Control":
                    "no-store"
            }

        );

    }

};
