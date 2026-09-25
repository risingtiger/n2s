import zlib from "node:zlib";
const Compress = (data)=>new Promise((resolve, reject)=>{
        zlib.brotliCompress(data, {
            params: {
                [zlib.constants.BROTLI_PARAM_QUALITY]: 6,
                [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT
            }
        }, (error, result)=>{
            if (error) {
                reject(error);
                return;
            }
            resolve(result);
        });
    });
const BundleJavascript = async (absolute_prefix, files, is_prod)=>{
    const entrypoint = absolute_prefix + "__simple_bundle__.js";
    const result = await Bun.build({
        entrypoints: [
            entrypoint
        ],
        files: {
            [entrypoint]: files.map((file)=>`import ${JSON.stringify(absolute_prefix + file)};`).join("\n")
        },
        target: "browser",
        format: "esm",
        minify: is_prod,
        env: "disable"
    });
    if (!result.success) throw new AggregateError(result.logs, "Could not bundle JavaScript");
    return result.outputs[0].text();
};
const SerializeTemplateLiteralData = (data)=>{
    // Map entries survive JSON transport and can be restored with new Map(result.d).
    // Escaping '<' also prevents data containing </script> from ending an inline script.
    return JSON.stringify(data, (_key, value)=>value instanceof Map ? [
            ...value
        ] : value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
};
const Utils = {
    Compress,
    BundleJavascript,
    SerializeTemplateLiteralData
};
export default Utils;
