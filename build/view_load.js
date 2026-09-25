import * as path_util from "node:path";
export async function ViewLoad(viewurl, basepath, static_dir, lazyloads, is_prod) {
    const pathname = new URL(viewurl, "http://localhost/").pathname.replace(/^\/(?:v\/)?/, "");
    const view = [
        ...lazyloads
    ].find((lazyload)=>{
        if (lazyload.type !== "view") return false;
        if (lazyload.urlmatch_regex) return new RegExp(lazyload.urlmatch_regex).test(pathname);
        if (!lazyload.urlmatch) return false;
        const pattern = lazyload.urlmatch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:([a-zA-Z_0-9]+)/g, "([^/]+)");
        return new RegExp(`^${pattern}$`).test(pathname);
    });
    if (!view) throw new Error(`Lazyload view not found: ${viewurl}`);
    const relative_base = `${view.is_instance ? "instance/" : ""}lazy/views/${view.name}/${view.name}`;
    const absolute_prefix = path_util.resolve(basepath, static_dir);
    const headers = new Headers({
        "Content-Type": "text/javascript; charset=UTF-8",
        "Cache-Control": "no-store"
    });
    if (!is_prod) {
        const base = path_util.resolve(absolute_prefix, relative_base);
        const [javascript, html] = await Promise.all([
            Bun.file(base + ".js").text(),
            Bun.file(base + ".html").text()
        ]);
        const css_url = "/" + relative_base.split(path_util.sep).join("/") + ".css";
        const style = `<link rel="stylesheet" href="${css_url}">`;
        const returnstr = javascript.replace(/\{--html--\}|\{--css(?:--)?\}/g, (placeholder)=>escape_template(placeholder === "{--html--}" ? html : style));
        return new Response(returnstr, {
            status: 200,
            headers
        });
    }
    const paths = [
        `${relative_base}.js.br`,
        `${relative_base}.min.js`,
        `${relative_base}.js`
    ];
    const path = await first_existing_path(absolute_prefix, paths);
    if (path.endsWith(".br")) headers.set("Content-Encoding", "br");
    return new Response(Bun.file(path_util.resolve(absolute_prefix, path)), {
        status: 200,
        headers
    });
}
function escape_template(value) {
    // Placeholders live in template literals; preserve ${...} for lit-html expressions.
    return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
}
async function first_existing_path(absolute_prefix, paths) {
    for (const path of paths){
        if (await Bun.file(path_util.resolve(absolute_prefix, path)).exists()) return path;
    }
    // View build outputs are required; let Bun return the missing fallback if none exist.
    return paths[paths.length - 1];
}
