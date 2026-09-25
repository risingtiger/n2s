import Utils from "./utils.js";
import { AppColdLoadView } from "./appcoldload_view.js";
const _cached_asset_files = {
    indexhtml: '',
    indexcss: '',
    maincss: '',
    instancemaincss: '',
    iconscss: '',
    mainjs: ''
};
let _is_asset_files_cached = false;
export async function AppColdLoad(viewurl, basepath, static_dir, lazyloads, is_prod) {
    const absolute_prefix = basepath + static_dir;
    await load_app_shell_assets(absolute_prefix, is_prod);
    const appshellassets_inlined_string = await appshellassets_inlined(viewurl, basepath, static_dir, lazyloads, is_prod);
    const htmlstr = _cached_asset_files.indexhtml.replace('<!--{--js_css--}-->', ()=>appshellassets_inlined_string + "\n" + '');
    return {
        returnstr: htmlstr
    };
}
async function appshellassets_inlined(viewurl, basepath, static_dir, lazyloads, is_prod) {
    const { returnstr } = await AppColdLoadView(viewurl, basepath, static_dir, lazyloads, is_prod);
    let style = '';
    let script = `<script type="module" name='main'>${_cached_asset_files.mainjs}</script>`;
    // Publish the module-scoped data only for app cold loads; the client consumes this once.
    script += `\n<script type="module" name='view'>${returnstr}\n;\nwindow.__n2_appcoldload = viewdata;\n</script>`;
    if (is_prod) {
        style = `<style name='indexcss'>${_cached_asset_files.indexcss}</style>`;
        const sheets = [
            [
                "iconscss",
                _cached_asset_files.iconscss
            ],
            [
                "maincss",
                _cached_asset_files.maincss
            ],
            [
                "instancemaincss",
                _cached_asset_files.instancemaincss
            ]
        ].map(([name, css])=>`window.css_${name} = new CSSStyleSheet(); window.css_${name}.replaceSync(${Utils.SerializeTemplateLiteralData(css)});`).join("\n");
        style += `<script>${sheets}\ndocument.adoptedStyleSheets.push(window.css_iconscss, window.css_maincss, window.css_instancemaincss);</script>`;
    } else {
        // Keep dev CSS external for Chrome editing; absolute URLs also work on /v/... routes.
        style = `<link rel='stylesheet' href='/index.css'>`;
        style += `<link rel='stylesheet' href='/main.css'>`;
        style += `<link rel='stylesheet' href='/instance/main.css'>`;
        style += `<link rel='stylesheet' href='/instance/icons.css'>`;
    }
    return script + '\n\n' + style;
}
async function load_app_shell_assets(absolute_prefix, is_prod) {
    if (_is_asset_files_cached) return;
    const [indexhtml, indexcss, maincss, instancemaincss, iconscss, mainjs] = await Promise.all([
        Bun.file(absolute_prefix + "instance/index.html").text(),
        is_prod ? Bun.file(absolute_prefix + `index${is_prod ? '.min' : ''}.css`).text() : '',
        is_prod ? Bun.file(absolute_prefix + `main${is_prod ? '.min' : ''}.css`).text() : '',
        is_prod ? Bun.file(absolute_prefix + `instance/main${is_prod ? '.min' : ''}.css`).text() : '',
        is_prod ? Bun.file(absolute_prefix + `instance/icons${is_prod ? '.min' : ''}.css`).text() : '',
        is_prod ? Bun.file(absolute_prefix + "main.min.js").text() : Utils.BundleJavascript(absolute_prefix, [
            'main.js'
        ], false)
    ]);
    _cached_asset_files.indexhtml = indexhtml;
    _cached_asset_files.indexcss = indexcss;
    _cached_asset_files.maincss = maincss;
    _cached_asset_files.instancemaincss = instancemaincss;
    _cached_asset_files.iconscss = iconscss;
    _cached_asset_files.mainjs = mainjs;
    _is_asset_files_cached = true;
}
