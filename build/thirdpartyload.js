import * as path_util from "node:path";
const _cached_thirdparty_files = new Map();
export async function ThirdPartyLoad(name, basepath, static_dir, lazyloads, is_prod) {
    const thirdparty = [
        ...lazyloads
    ].find((lazyload)=>lazyload.type === "thirdparty" && lazyload.name === name);
    if (!thirdparty) throw new Error(`Lazyload thirdparty not found: ${name}`);
    const absolute_prefix = path_util.resolve(basepath, static_dir);
    const file = `${thirdparty.is_instance ? "instance/" : ""}thirdparty/${thirdparty.name}${is_prod ? ".min" : ""}.js`;
    const absolute_file = path_util.resolve(absolute_prefix, file);
    const cached = _cached_thirdparty_files.get(absolute_file);
    if (cached !== undefined) return {
        returnstr: cached
    };
    const returnstr = await bundle_javascript(absolute_file);
    _cached_thirdparty_files.set(absolute_file, returnstr);
    return {
        returnstr
    };
}
const bundle_javascript = async (file)=>{
    const result = await Bun.build({
        entrypoints: [
            file
        ],
        target: "browser",
        format: "iife",
        splitting: false,
        minify: false,
        env: "disable"
    });
    if (!result.success) throw new AggregateError(result.logs, "Could not bundle thirdparty JavaScript");
    return result.outputs[0].text();
};
