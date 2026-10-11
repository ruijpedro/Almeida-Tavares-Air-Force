#!/usr/bin/env python3
"""Aplica ao projeto Capacitor os ícones exclusivos de César Ricardo."""
from pathlib import Path
from shutil import copy2

root = Path(__file__).resolve().parent.parent
native = root / 'android/app/src/main/res'
assets = root / 'android_assets'
if not native.exists():
    raise SystemExit('Projeto Android ainda não criado: executar npx cap add android antes.')

for icon in assets.rglob('*.png'):
    target = native / icon.relative_to(assets)
    target.parent.mkdir(parents=True, exist_ok=True)
    copy2(icon, target)

adaptive = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/cesar_icon_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
'''
folder = native / 'mipmap-anydpi-v26'
folder.mkdir(parents=True, exist_ok=True)
for name in ('ic_launcher.xml', 'ic_launcher_round.xml'):
    (folder / name).write_text(adaptive, encoding='utf-8')

colors = native / 'values' / 'cesar_launcher_colors.xml'
colors.parent.mkdir(parents=True, exist_ok=True)
colors.write_text('''<?xml version="1.0" encoding="utf-8"?>
<resources><color name="cesar_icon_background">#071523</color></resources>
''', encoding='utf-8')
print('Ícones de César Ricardo instalados no projeto Android.')
