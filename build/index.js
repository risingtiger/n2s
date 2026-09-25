import { AppColdLoad } from "./appcoldload.js";
import { ComponentLoad } from "./componentload.js";
import { ThirdPartyLoad } from "./thirdpartyload.js";
import { ViewDataLoad } from "./view_dataload.js";
import { ViewLoad } from "./view_load.js";
import { GeneralAssetFile } from "./filerequest.js";
import { GetRawIconsCSS, GetRawIndex, GetRawIndexCSS, GetRawInstanceMainCSS, GetRawMainCSS, GetRawMainJS } from "./raw_core_assets.js";
import Utils from "./utils.js";
const VAR_NODE_ENV = process.env.NODE_ENV || 'dev';
const BASEPATH = process.cwd() + "/";
const STATIC_DIR = VAR_NODE_ENV === "dev" ? "static_dev/" : "static_dist/";
const APPVERSION = 0;
const IS_PROD = VAR_NODE_ENV === "dev" ? false : true;
let _cached_lazyloads = null;
export async function HandleRequest(req) {
    if (req.method !== "GET") return null;
    const url = new URL(req.url);
    const pathname = url.pathname;
    if (pathname === "/favicon.ico") return favicon();
    if (pathname === "/apple-touch-icon.png") return apple_touch_icon();
    if (pathname === "/apple-touch-icon-precomposed.png") return apple_touch_icon_precomposed();
    if (pathname === "/api/view-data") return serveviewdata(url.searchParams.get("viewpath"), await loadlazyloads());
    if (pathname === "/api/view-load") return serveviewload(url.searchParams.get("viewpath"), await loadlazyloads());
    if (pathname === "/api/component-load") return servecomponent(url.searchParams.get("name"), await loadlazyloads());
    if (pathname === "/api/thirdparty-load") return servethirdparty(url.searchParams.get("name"), await loadlazyloads());
    if (pathname === "/api/get_raw_index") return GetRawIndex(BASEPATH, STATIC_DIR, IS_PROD);
    if (pathname === "/api/get_raw_mainjs") return GetRawMainJS(BASEPATH, STATIC_DIR, IS_PROD);
    if (pathname === "/api/get_raw_indexcss") return GetRawIndexCSS(BASEPATH, STATIC_DIR, IS_PROD);
    if (pathname === "/api/get_raw_maincss") return GetRawMainCSS(BASEPATH, STATIC_DIR, IS_PROD);
    if (pathname === "/api/get_raw_instancemaincss") return GetRawInstanceMainCSS(BASEPATH, STATIC_DIR, IS_PROD);
    if (pathname === "/api/get_raw_iconscss") return GetRawIconsCSS(BASEPATH, STATIC_DIR, IS_PROD);
    if (pathname === "/" || pathname === "/index.html") return serve_appcoldload("home" + url.search, await loadlazyloads());
    if (pathname.startsWith("/v/")) return serve_appcoldload(pathname.slice(3) + url.search, await loadlazyloads());
    // View loaders execute on the server and must never be served as browser assets.
    if (/_load(?:\.min)?\.js$/.test(pathname)) return new Response("Not found", {
        status: 404
    });
    return general_asset_file(req);
}
function favicon() {
    return new Response(Bun.file(BASEPATH + STATIC_DIR + "instance/media/favicon.svg"));
}
function apple_touch_icon() {
    return new Response(Bun.file(BASEPATH + STATIC_DIR + "media/pwticons/apple-touch-icon.png"));
}
function apple_touch_icon_precomposed() {
    return new Response(Bun.file(BASEPATH + STATIC_DIR + "media/pwticons/apple-touch-icon-precomposed.png"));
}
async function serveviewdata(viewpath, lazyloads) {
    if (!viewpath) {
        return new Response("Missing viewpath", {
            status: 400,
            headers: {
                'Content-Type': 'text/plain; charset=UTF-8',
                'Cache-Control': 'no-store'
            }
        });
    }
    try {
        const data = await ViewDataLoad(viewpath, BASEPATH, STATIC_DIR, lazyloads, IS_PROD);
        return new Response(Utils.SerializeTemplateLiteralData(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Cache-Control': 'no-store'
            }
        });
    } catch  {
        return new Response("Could not load view data: " + viewpath, {
            status: 400,
            headers: {
                'Content-Type': 'text/plain; charset=UTF-8',
                'Cache-Control': 'no-store'
            }
        });
    }
}
async function serveviewload(viewpath, lazyloads) {
    if (!viewpath) {
        return new Response("Missing viewpath", {
            status: 400,
            headers: {
                'Content-Type': 'text/plain; charset=UTF-8',
                'Cache-Control': 'no-store'
            }
        });
    }
    try {
        return await ViewLoad(viewpath, BASEPATH, STATIC_DIR, lazyloads, IS_PROD);
    } catch  {
        return module_load_error("view", viewpath);
    }
}
async function servecomponent(name, lazyloads) {
    if (!name) return missing_module_name("component");
    try {
        const { returnstr } = await ComponentLoad(name, BASEPATH, STATIC_DIR, lazyloads, IS_PROD);
        return javascript_response(returnstr);
    } catch  {
        return module_load_error("component", name);
    }
}
async function servethirdparty(name, lazyloads) {
    if (!name) return missing_module_name("thirdparty");
    try {
        const { returnstr } = await ThirdPartyLoad(name, BASEPATH, STATIC_DIR, lazyloads, IS_PROD);
        return javascript_response(returnstr);
    } catch  {
        return module_load_error("thirdparty", name);
    }
}
async function loadlazyloads() {
    if (_cached_lazyloads) return _cached_lazyloads;
    const mainjson = await Bun.file(BASEPATH + STATIC_DIR + "main.json").json();
    _cached_lazyloads = new Set([
        ...mainjson.MAIN.LAZYLOADS,
        ...mainjson.INSTANCE.LAZYLOADS
    ]);
    return _cached_lazyloads;
}
function javascript_response(javascript) {
    return new Response(javascript, {
        status: 200,
        headers: {
            'Content-Type': 'text/javascript; charset=UTF-8',
            'Cache-Control': 'no-store'
        }
    });
}
function missing_module_name(type) {
    return new Response(`Missing ${type} name`, {
        status: 400,
        headers: {
            'Content-Type': 'text/plain; charset=UTF-8',
            'Cache-Control': 'no-store'
        }
    });
}
function module_load_error(type, name) {
    return new Response(`Could not load ${type}: ${name}`, {
        status: 400,
        headers: {
            'Content-Type': 'text/plain; charset=UTF-8',
            'Cache-Control': 'no-store'
        }
    });
}
async function serve_appcoldload(path_str, lazyloads) {
    try {
        const { returnstr } = await AppColdLoad(path_str, BASEPATH, STATIC_DIR, lazyloads, IS_PROD);
        const headers = new Headers({
            'Content-Type': 'text/html; charset=UTF-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
        });
        if (!IS_PROD) return new Response(returnstr, {
            status: 200,
            headers
        });
        headers.set('Content-Encoding', 'br');
        return new Response(Uint8Array.from(await Utils.Compress(returnstr)), {
            status: 200,
            headers
        });
    } catch  {
        return new Response("Could not load view: " + path_str, {
            status: 400,
            headers: {
                'Content-Type': 'text/plain; charset=UTF-8',
                'Cache-Control': 'no-store'
            }
        });
    }
}
async function general_asset_file(req) {
    const headers = new Headers();
    let response = null;
    const res = {
        set (name, value) {
            headers.set(name, value);
        },
        sendFile (path) {
            response = new Response(Bun.file(path), {
                headers
            });
        }
    };
    const nocache = !new URL(req.url).pathname.includes("shared_worker.js") // not yet sure why shared_worker is being cached
    ;
    await GeneralAssetFile(req.url, res, BASEPATH, STATIC_DIR, nocache, IS_PROD);
    return response ?? new Response("Not found", {
        status: 404
    });
} // END ROUTES
 // app.options("/sse_add_listener", cors());
 // app.get("/sse_add_listener",     cors(), sse_add_listener)
 // app.get('/v/*restofpath', serveview)
 // async function sse_add_listener(req:any, res:any) {
 //
 //     SSE.Add_Listener(req, res)
 // }
