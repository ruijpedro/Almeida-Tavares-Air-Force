#!/usr/bin/env python3
"""Incrementa versionCode no APK gerado pela GitHub Action."""
import re
import sys
from pathlib import Path

file = Path('android/app/build.gradle')
if not file.exists():
    raise SystemExit('Android ainda não foi gerado: executar npx cap add android.')
number = int(sys.argv[1]) if len(sys.argv) > 1 else 1
if number < 1 or number > 2_000_000_000:
    raise SystemExit('Número de versão inválido.')
s = file.read_text(encoding='utf-8')
s, count = re.subn(r'(?m)^\s*versionCode\s+\d+\s*$', f'        versionCode {10000 + number}', s, count=1)
if count != 1:
    raise SystemExit('Campo versionCode não encontrado no build.gradle.')
s, count = re.subn(r'(?m)^\s*versionName\s+"[^"]+"\s*$', f'        versionName "1.1.{number}"', s, count=1)
if count != 1:
    raise SystemExit('Campo versionName não encontrado no build.gradle.')
file.write_text(s, encoding='utf-8')
print(f'Android: versionCode={10000+number}; versionName=1.1.{number}')
