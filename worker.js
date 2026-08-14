const ZAPI_URL = "https://zpi.web.id/api/finance/idx/raw";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export default {
  async fetch(request, env) {

    // OPTIONS / CORS PREFLIGHT
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS,
      });
    }

    if (request.method !== "GET") {
      return json({
        error: "Method not allowed"
      }, 405);
    }

    const apiKey = env.ZAPI_API_KEY;

    if (!apiKey) {
      return json({
        error: "ZAPI_API_KEY belum tersedia di Worker"
      }, 500);
    }

    try {

      const incoming =
        new URL(request.url);

      const path =
        incoming.searchParams.get("path");

      const query =
        incoming.searchParams.get("query");

      if (!path) {
        return json({
          error: "Parameter path kosong"
        }, 400);
      }

      // URL Zapi
      const target =
        new URL(ZAPI_URL);

      target.searchParams.set(
        "path",
        path
      );

      if (query) {
        target.searchParams.set(
          "query",
          query
        );
      }

      console.log(
        "ZAPI REQUEST:",
        target.toString()
      );

      const upstream =
        await fetch(
          target.toString(),
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

      const body =
        await upstream.text();

      return new Response(
        body,
        {
          status:
            upstream.status,

          headers: {
            ...CORS,

            "Content-Type":
              "application/json; charset=utf-8",

            "Cache-Control":
              "no-store"
          }
        }
      );

    } catch (error) {

      return json({
        error:
          "Worker gagal menghubungi Zapi",

        message:
          error?.message ||
          String(error)
      }, 502);

    }

  }
};
