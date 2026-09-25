import * as path_util from "node:path";
import { ComponentLoad } from "./componentload.js";
import { ThirdPartyLoad } from "./thirdpartyload.js";
import { ViewDataLoad } from "./view_dataload.js";
import Utils from "./utils.js";
export async function AppColdLoadView(viewurl, basepath, static_dir, lazyloads, is_prod) {
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
    const absolute_prefix = path_util.resolve(basepath, static_dir);
    const file = `${view.is_instance ? "instance/" : ""}lazy/views/${view.name}/${view.name}${is_prod ? ".min" : ""}.js`;
    const [view_js, viewdata] = await Promise.all([
        bundle_javascript(absolute_prefix, file, is_prod),
        ViewDataLoad(viewurl, basepath, static_dir, lazyloads, is_prod)
    ]);
    const component_names = new Set((view.dependencies ?? []).filter((dependency)=>dependency.type === "component").map((dependency)=>dependency.name));
    const thirdparty_names = new Set((view.dependencies ?? []).filter((dependency)=>dependency.type === "thirdparty").map((dependency)=>dependency.name));
    const [thirdparties, components] = await Promise.all([
        Promise.all([
            ...thirdparty_names
        ].map((name)=>ThirdPartyLoad(name, basepath, static_dir, lazyloads, is_prod))),
        Promise.all([
            ...component_names
        ].map((name)=>ComponentLoad(name, basepath, static_dir, lazyloads, is_prod)))
    ]);
    const returnstr = [
        ...thirdparties.map((thirdparty)=>thirdparty.returnstr),
        ...components.map((component)=>component.returnstr),
        `const viewdata = ${Utils.SerializeTemplateLiteralData(viewdata)}`,
        view_js
    ].join("\n;\n");
    return {
        returnstr
    };
}
const bundle_javascript = async (absolute_prefix, file, is_prod)=>{
    const result = await Bun.build({
        entrypoints: [
            path_util.resolve(absolute_prefix, file)
        ],
        target: "browser",
        format: "esm",
        splitting: false,
        minify: false,
        env: "disable",
        plugins: [
            {
                name: "inline-view-assets",
                setup (build) {
                    build.onLoad({
                        filter: /\.js$/
                    }, async ({ path })=>{
                        const js = await Bun.file(path).text();
                        const has_html = js.includes("{--html--}");
                        const has_css = /\{--css(?:--)?\}/.test(js);
                        if (!has_html && !has_css) return {
                            contents: js,
                            loader: "js"
                        };
                        // Placeholder assets share the JS filename stem and directory, including imports.
                        // Missing referenced assets fail the build; CSS URLs/@imports remain unchanged.
                        const base = path.slice(0, -3);
                        const [html, css] = await Promise.all([
                            has_html ? Bun.file(base + ".html").text() : "",
                            has_css && is_prod ? Bun.file(base + ".css").text() : ""
                        ]);
                        const css_url = "/" + path_util.relative(absolute_prefix, base + ".css").split(path_util.sep).join("/");
                        const style = is_prod ? `<style>${css}</style>` : `<link rel="stylesheet" href="${css_url}">`;
                        return {
                            contents: js.replace(/\{--html--\}|\{--css(?:--)?\}/g, (placeholder)=>escape_template(placeholder === "{--html--}" ? html : style)),
                            loader: "js"
                        };
                    });
                }
            }
        ]
    });
    if (!result.success) throw new AggregateError(result.logs, "Could not assemble view assets");
    return result.outputs[0].text();
};
function escape_template(value) {
    // Placeholders live in template literals; preserve ${...} for lit-html expressions.
    return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
}
