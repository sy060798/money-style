// =====================================================
// MONEY STYLE SCANNER
// CLOUDFLARE WORKER
// ZAPI IDX CORS PROXY
// =====================================================

const ZAPI_BASE_URL =
    "https://zpi.web.id";


// =====================================================
// CORS
// =====================================================

const CORS_HEADERS = {

    "Access-Control-Allow-Origin":
        "*",

    "Access-Control-Allow-Methods":
        "GET, OPTIONS",

    "Access-Control-Allow-Headers":
        "Content-Type, Authorization",

    "Access-Control-Max-Age":
        "86400"

};


// =====================================================
// RESPONSE
// =====================================================

function corsResponse(
    body,
    status = 200,
    extraHeaders = {}
) {

    const headers =
        new Headers({

            ...CORS_HEADERS,

            ...extraHeaders,

            "Content-Type":
                "application/json; charset=utf-8"

        });


    return new Response(
        body,
        {
            status,
            headers
        }
    );
}


// =====================================================
// WORKER
// =====================================================

export default {

    async fetch(
        request,
        env
    ) {

        // ---------------------------------------------
        // OPTIONS / PREFLIGHT
        // ---------------------------------------------

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


        // ---------------------------------------------
        // HANYA GET
        // ---------------------------------------------

        if (
            request.method !==
            "GET"
        ) {

            return corsResponse(
                JSON.stringify({
                    error:
                        "Method not allowed"
                }),
                405
            );

        }


        // ---------------------------------------------
        // API KEY
        // ---------------------------------------------

        const apiKey =
            env.ZAPI_API_KEY;


        if (!apiKey) {

            return corsResponse(
                JSON.stringify({
                    error:
                        "ZAPI_API_KEY belum dikonfigurasi di Cloudflare Worker"
                }),
                500
            );

        }


        // ---------------------------------------------
        // URL REQUEST
        // ---------------------------------------------

        const incomingUrl =
            new URL(
                request.url
            );


        // ---------------------------------------------
        // PROXY KE ZAPI
        // ---------------------------------------------

        const upstreamUrl =
            new URL(
                "/api/finance/idx/raw",
                ZAPI_BASE_URL
            );


        // Copy query:
        //
        // ?path=TradingSummary%2FGetStockSummary
        // &query=length%3D1000%26start%3D0%26kodeEmiten%3DBBCA
        //

        upstreamUrl.search =
            incomingUrl.search;


        // ---------------------------------------------
        // REQUEST KE ZAPI
        // ---------------------------------------------

        let upstreamResponse;


        try {

            upstreamResponse =
                await fetch(
                    upstreamUrl.toString(),
                    {

                        method: "GET",

                        headers: {

                            "Accept":
                                "application/json",

                            "Authorization":
                                `Bearer ${apiKey}`

                        }

                    }
                );

        } catch (error) {

            return corsResponse(
                JSON.stringify({
                    error:
                        "Gagal menghubungi Zapi",
                    message:
                        error?.message ||
                        "Network error"
                }),
                502
            );

        }


        // ---------------------------------------------
        // AMBIL RESPONSE
        // ---------------------------------------------

        const body =
            await upstreamResponse.text();


        // ---------------------------------------------
        // RESPONSE KE BROWSER
        // ---------------------------------------------

        return corsResponse(
            body,
            upstreamResponse.status,
            {
                "Cache-Control":
                    "no-store"
            }
        );

    }

};
