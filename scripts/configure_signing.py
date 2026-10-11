#!/usr/bin/env python3
"""Liga a assinatura privada Android aos segredos fornecidos pela Action.
Nunca guarda segredos no repositório.
"""
import os
from pathlib import Path

required = ('RJP_KEYSTORE_PATH', 'RJP_STORE_PASSWORD', 'RJP_KEY_ALIAS', 'RJP_KEY_PASSWORD')
if not all(os.getenv(key) for key in required):
    raise SystemExit('Faltam variáveis de ambiente de assinatura.')
project = Path('android/app')
(project/'release-signing.gradle').write_text('''
android {
    signingConfigs {
        create("rjpRelease") {
            storeFile = file(System.getenv("RJP_KEYSTORE_PATH"))
            storePassword = System.getenv("RJP_STORE_PASSWORD")
            keyAlias = System.getenv("RJP_KEY_ALIAS")
            keyPassword = System.getenv("RJP_KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.rjpRelease
        }
    }
}
''', encoding='utf-8')
file = project/'build.gradle'
s = file.read_text(encoding='utf-8')
if "apply from: 'release-signing.gradle'" not in s:
    file.write_text(s + "\napply from: 'release-signing.gradle'\n", encoding='utf-8')
print('Assinatura de release configurada a partir dos GitHub Secrets.')
