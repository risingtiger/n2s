import { GetViewBasePath } from "./appcoldload_load.js";
export function GetViewScripts(lazyload, all_lazyloads) {
    const files = [];
    const seen = new Set();
    function add(item) {
        const prefix = item.is_instance ? "instance/" : "";
        const path = item.type === "thirdparty" ? `${prefix}thirdparty/${item.name}.js` : item.type === "component" ? `${prefix}lazy/components/${item.name}/${item.name}.js` : GetViewBasePath(item) + ".js";
        if (seen.has(path)) return;
        seen.add(path);
        for (const dependency of item.dependencies ?? []){
            const match = all_lazyloads.find((entry)=>entry.name === dependency.name && entry.type === dependency.type);
            if (!match) throw new Error(`Lazyload dependency not found: ${dependency.name} in ${item.name}`);
            add(match);
        }
        files.push({
            name: item.name,
            path,
            tag: custom_element_tag(item)
        });
    }
    add(lazyload);
    return files;
}
// Only views (v-) and components (c-) register custom elements; thirdparty/lib entries have no tag.
function custom_element_tag(item) {
    if (item.type === "view") return `v-${item.name}`;
    if (item.type === "component") return `c-${item.name}`;
    return undefined;
}
