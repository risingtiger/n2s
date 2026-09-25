import { cars } from "./dummydata.js";
export async function FetchLassie(url, http_opts = {}, _opts = {}) {
    const headers = new Headers({
        "Content-Type": "application/json"
    });
    // Stub only: no network, authentication, writes, props projection, or client UI/cache options.
    if (http_opts.method && http_opts.method !== "GET") {
        return {
            headers,
            status: 405,
            statusText: "Method Not Allowed",
            ok: false
        };
    }
    const pathname = new URL(url, "http://localhost").pathname;
    const match = /^\/api\/dummydata\/cars(?:\/([^/]+))?\/?$/.exec(pathname);
    if (!match) return {
        headers,
        status: 404,
        statusText: "Not Found",
        ok: false
    };
    const id = match[1] ? decodeURIComponent(match[1]) : null;
    const data = id ? cars.filter((car)=>car.id === id) : cars;
    // Each call gets its own records, so loaders cannot mutate another request's fixture data.
    return {
        headers,
        status: 200,
        statusText: "OK",
        ok: true,
        data: structuredClone(data)
    };
}
globalThis.$N = {
    FetchLassie
};
