export function GetRawIndex(basepath, static_dir, is_prod) {
    return raw_asset_response(basepath, static_dir, is_prod, {
        content_type: "text/html; charset=UTF-8",
        path: "instance/index.html"
    });
}
export function GetRawMainJS(basepath, static_dir, is_prod) {
    return raw_asset_response(basepath, static_dir, is_prod, {
        content_type: "text/javascript; charset=UTF-8",
        path: "main.js"
    });
}
export function GetRawIndexCSS(basepath, static_dir, is_prod) {
    return raw_asset_response(basepath, static_dir, is_prod, {
        content_type: "text/css; charset=UTF-8",
        path: "index.css"
    });
}
export function GetRawMainCSS(basepath, static_dir, is_prod) {
    return raw_asset_response(basepath, static_dir, is_prod, {
        content_type: "text/css; charset=UTF-8",
        path: "main.css"
    });
}
export function GetRawInstanceMainCSS(basepath, static_dir, is_prod) {
    return raw_asset_response(basepath, static_dir, is_prod, {
        content_type: "text/css; charset=UTF-8",
        path: "instance/main.css"
    });
}
export function GetRawIconsCSS(basepath, static_dir, is_prod) {
    return raw_asset_response(basepath, static_dir, is_prod, {
        content_type: "text/css; charset=UTF-8",
        path: "instance/icons.css"
    });
}
async function raw_asset_response(basepath, static_dir, is_prod, options) {
    const paths = asset_paths(options.path, is_prod);
    const path = await first_existing_path(basepath + static_dir, paths);
    const headers = new Headers({
        "Content-Type": options.content_type,
        "Cache-Control": "no-store"
    });
    const file = Bun.file(basepath + static_dir + path);
    const contents = await file.arrayBuffer();
    if (path.endsWith(".br")) headers.set("Content-Encoding", "br");
    return new Response(contents, {
        status: 200,
        headers
    });
}
function asset_paths(path, is_prod) {
    if (!is_prod) return [
        path
    ];
    return [
        `${path}.br`,
        path
    ];
}
async function first_existing_path(absolute_prefix, paths) {
    for (const path of paths){
        if (await Bun.file(absolute_prefix + path).exists()) return path;
    }
    // Core assets are required build outputs; let Bun return the missing fallback if none exist.
    return paths[paths.length - 1];
}
