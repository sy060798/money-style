// =====================================================
// MONEY STYLE SCANNER
// Cloudflare Worker → Zapi IDX
// =====================================================

const ZAPI_URL =
  "https://api.zpi.web.id/v1/finance:idx/raw";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request, env) {

    // =====================================================
    // CORS
    // =====================================================

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS,
      });
    }


    // =====================================================
    // METHOD
    // =====================================================

    if (request.method !== "GET") {
      return json({
        error: "Method not allowed",
      }, 405);
    }


    // =====================================================
    // API KEY
    // =====================================================

    const apiKey = env.ZAPI_API_KEY;

    if (!apiKey) {
      return json({
        error: "ZAPI_API_KEY belum tersedia di Worker",
      }, 500);
    }


    try {

      const incoming =
        new URL(request.url);


      // ===================================================
      // PARAMETER
      // ===================================================

      const path =
        incoming.searchParams.get("path");

      const query =
        incoming.searchParams.get("query");

      const code =
        incoming.searchParams.get("code");

      const date =
        incoming.searchParams.get("date");

      const length =
        incoming.searchParams.get("length");

      const start =
        incoming.searchParams.get("start");


      // ===================================================
      // PATH WAJIB
      // ===================================================

      if (!path) {
        return json({
          error: "Parameter path kosong",
          example:
            "?path=ISI_ENDPOINT&code=BBCA&length=150",
        }, 400);
      }


      // ===================================================
      // TARGET ZAPI
      // ===================================================

      const target =
        new URL(ZAPI_URL);


      target.searchParams.set(
        "path",
        path
      );


      // ===================================================
      // QUERY
      // ===================================================

      if (query) {
        target.searchParams.set(
          "query",
          query
        );
      }


      // ===================================================
      // CODE
      // ===================================================

      if (code) {
        target.searchParams.set(
          "code",
          code.toUpperCase()
        );
      }


      // ===================================================
      // DATE
      // ===================================================

      if (date) {
        target.searchParams.set(
          "date",
          date
        );
      }


      // ===================================================
      // LENGTH
      // ===================================================

      if (length) {

        let n =
          Number(length);

        if (
          Number.isFinite(n) &&
          n > 0
        ) {

          n =
            Math.min(
              Math.floor(n),
              1000
            );

          target.searchParams.set(
            "length",
            String(n)
          );
        }
      }


      // ===================================================
      // START
      // ===================================================

      if (start) {

        let n =
          Number(start);

        if (
          Number.isFinite(n) &&
          n >= 0
        ) {

          target.searchParams.set(
            "start",
            String(Math.floor(n))
          );
        }
      }


      // ===================================================
      // LOG
      // =====================================================

      console.log(
        "ZAPI REQUEST:",
        target.toString()
      );


      // =====================================================
      // REQUEST ZAPI
      // =====================================================

      const upstream =
        await fetch(
          target.toString(),
          {
            method: "GET",

            headers: {
              "Accept":
                "application/json",

              "Authorization":
                `Bearer ${apiKey}`,
            },
          }
        );


      // =====================================================
      // RESPONSE
      // =====================================================

      const body =
        await upstream.text();


      const contentType =
        upstream.headers.get(
          "content-type"
        ) ||
        "application/json; charset=utf-8";


      return new Response(
        body,
        {
          status:
            upstream.status,

          headers: {
            ...CORS,

            "Content-Type":
              contentType,

            "Cache-Control":
              "no-store",
          },
        }
      );


    } catch (error) {

      // =====================================================
      // WORKER ERROR
      // =====================================================

      return json({
        error:
          "Worker gagal menghubungi Zapi",

        message:
          error?.message ||
          String(error),
      }, 502);
    }
  },
};
