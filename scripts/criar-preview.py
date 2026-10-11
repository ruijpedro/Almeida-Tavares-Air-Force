#!/usr/bin/env python3
"""Gera uma demonstração autónoma, sem npm nem rede (preview.html)."""
from pathlib import Path
base = Path(__file__).resolve().parent.parent
cfg = (base/'src/config.js').read_text(encoding='utf-8').replace('export const ', 'const ')
main = (base/'src/main.js').read_text(encoding='utf-8')
main = main.replace("import './styles.css';", '')
main = main.replace("import { APP_NAME, APP_SUBTITLE, APP_VERSION, CITY_ZONES, STORAGE_KEY } from './config.js';", '')
main = main.replace('import.meta.env.BASE_URL', "'./'")
css = (base/'src/styles.css').read_text(encoding='utf-8')
html = '''<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#071523"><title>Almeida Tavares Air Force — Sempre no Ar · Pré-visualização offline</title><style>''' + css + '''</style></head><body><div id="app"></div><script>''' + cfg + '\n' + main + '''</script></body></html>'''
(base/'preview.html').write_text(html, encoding='utf-8')
print('Preview criada:', base/'preview.html')
