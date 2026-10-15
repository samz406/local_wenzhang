"""Build the self-contained bookmark installer and the unpacked-extension ZIP."""

from pathlib import Path
import html
import json
from urllib.parse import quote
import zipfile

ROOT = Path(__file__).resolve().parent
source = (ROOT / 'exporter.js').read_text()
# Keep source intact: no unsafe regex-based JS minification.
bookmarklet = 'javascript:' + quote('(function(){\n' + source + '\nXArticleExporter.run();\n})();', safe='')
template = (ROOT / 'installer.template.html').read_text()
output = template.replace('__BOOKMARKLET_HREF__', html.escape(bookmarklet, quote=True))
output = output.replace('__BOOKMARKLET_JSON__', json.dumps(bookmarklet).replace('<', '\\u003c'))
(ROOT / 'install.html').write_text(output)
files = ['manifest.json', 'background.js', 'exporter.js', 'run-export.js', 'install.html',
         'README.md', 'build.py', 'installer.template.html', 'test.mjs', 'test-dom.mjs']
with zipfile.ZipFile(ROOT / 'x-article-exporter.zip', 'w', zipfile.ZIP_DEFLATED) as package:
    for name in files:
        info = zipfile.ZipInfo('x-article-exporter/' + name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        package.writestr(info, (ROOT / name).read_bytes())
print(f'Built install.html and x-article-exporter.zip; bookmark URL: {len(bookmarklet):,} characters')
