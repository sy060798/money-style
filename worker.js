// =====================================================
// MONEY STYLE SCANNER
// Cloudflare Worker -> Zapi IDX Stock History
// =====================================================

const ZAPI_URL =
  "https://api.zpi.web.id/v1/finance:idx/stock-history";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        ...CORS,
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "no-store",
      },
    }
  );
}

export default {

  async fetch(request, env) {

    // ===================================================
    // CORS PREFLIGHT
    // ===================================================

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS,
      });
    }


    // ===================================================
    // METHOD
    // ===================================================

    if (request.method !== "GET") {
      return json({
        error: "Method not allowed",
      }, 405);
    }


    // ===================================================
    // API KEY
    // ===================================================

    const apiKey =
      env.ZAPI_API_KEY;

    if (!apiKey) {
      return json({
        error:
          "ZAPI_API_KEY belum tersedia di Worker",
      }, 500);
    }


    try {

      // =================================================
      // REQUEST URL
      // =================================================

      const incoming =
        new URL(request.url);


      // =================================================
      // STOCK CODE
      // =================================================

      const code =
        (
          incoming.searchParams.get("code") ||
          ""
        )
          .trim()
          .toUpperCase();


      if (!code) {
        return json({
          error:
            "Parameter code kosong",

          example:
            "?code=BBCA&length=150",
        }, 400);
      }


      // =================================================
      // LENGTH
      // =================================================

      let length =
        Number(
          incoming.searchParams.get("length") ||
          150
        );


      if (!Number.isFinite(length)) {
        return json({
          error:
            "Parameter length tidak valid",
        }, 400);
      }


      length =
        Math.floor(length);


      if (length < 1) {
        length = 1;
      }


      if (length > 2000) {
        length = 2000;
      }


      // =================================================
      // OPTIONAL DATE RANGE
      // =================================================

      const from =
        incoming.searchParams.get("from");

      const to =
        incoming.searchParams.get("to");


      // =================================================
      // TARGET ZAPI
      // =================================================

      const target =
        new URL(ZAPI_URL);


      target.searchParams.set(
        "code",
        code
      );


      target.searchParams.set(
        "length",
        String(length)
      );


      if (from) {
        target.searchParams.set(
          "from",
          from
        );
      }


      if (to) {
        target.searchParams.set(
          "to",
          to
        );
      }


      // =================================================
      // REQUEST LOG
      // =================================================

      console.log(
        "ZAPI REQUEST:",
        target.toString()
      );


      // =================================================
      // CALL ZAPI
      // =================================================

      const upstream =
        await fetch(
          target.toString(),
          {
            method: "GET",

            headers: {
              "Accept":
                "application/json",

              "x-api-key":
                apiKey,
            },
          }
        );


      // =================================================
      // READ RESPONSE
      // =================================================

      const body =
        await upstream.text();


      const contentType =
        upstream.headers.get(
          "content-type"
        ) ||
        "application/json; charset=utf-8";


      // =================================================
      // RETURN ZAPI RESPONSE
      // =================================================

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

      // =================================================
      // WORKER ERROR
      // =================================================

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
