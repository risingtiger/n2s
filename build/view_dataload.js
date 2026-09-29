import * as path_util from "node:path";
import { pathToFileURL } from "node:url";
import "./fetchlassie.js";
import { URLBase } from "./url_base.js";
export async function ViewDataLoad(viewpath, basepath, static_dir, lazyloads, is_prod, request_url) {
    const absolute_prefix = path_util.resolve(basepath, static_dir);
    const url = new URL(viewpath, URLBase(basepath, request_url));
    const pathname = url.pathname.replace(/^\/(?:v\/)?/, "");
    const view = match_view(pathname, lazyloads);
    if (!view) throw new Error(`Lazyload view not found: ${viewpath}`);
    const { lazyload, pathparams } = view;
    const prefix = lazyload.is_instance ? "instance/" : "";
    const suffix = is_prod ? "_load.min.js" : "_load.js";
    const load_path = path_util.resolve(absolute_prefix, `${prefix}lazy/views/${lazyload.name}/${lazyload.name}${suffix}`);
    const module = await import(pathToFileURL(load_path).href);
    const searchparams = Object.fromEntries(url.searchParams);
    const [load_data, post_load_data] = await Promise.all([
        module.load?.(pathparams, searchparams) ?? {},
        module.post_load?.(pathparams, searchparams) ?? {}
    ]);
    return {
        data: {
            ...load_data,
            ...post_load_data
        },
        refreshon: []
    };
}
function match_view(pathname, lazyloads) {
    for (const lazyload of lazyloads){
        if (lazyload.type !== "view") continue;
        const match = match_url(pathname, lazyload);
        if (!match) continue;
        return {
            lazyload,
            pathparams: match
        };
    }
    return null;
}
function match_url(pathname, lazyload) {
    if (!lazyload.urlmatch) {
        if (!lazyload.urlmatch_regex) return null;
        const match = new RegExp(lazyload.urlmatch_regex).exec(pathname);
        return match ? {
            ...match.groups
        } : null;
    }
    const paramnames = [];
    const pattern = lazyload.urlmatch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:([a-zA-Z_0-9]+)/g, (_match, name)=>{
        paramnames.push(name);
        return "([^/]+)";
    });
    const match = new RegExp(`^${pattern}$`).exec(pathname);
    if (!match) return null;
    return Object.fromEntries(paramnames.map((name, index)=>[
            name,
            decodeURIComponent(match[index + 1])
        ]));
}
