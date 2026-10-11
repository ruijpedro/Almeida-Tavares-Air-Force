# Almeida Tavares Air Force ✈️

**Versão 1.2.1 · Edição Sempre 20 Anos · PT-PT**

Aplicação pessoal **Almeida Tavares Air Force**, criada para César Ricardo, com visual de aviação, cartão simbólico entre amigos, agenda de escalas, diário de voos, fusos horários, caderno de destinos e estatísticas. Funciona como **WebApp/PWA** e pode ser compilada como **APK Android** com Capacitor. Não é uma aplicação oficial da TAP nem um EFB aprovado.

## Experimenta a app, sem instalar nada

Na pasta do projeto, abre **`preview.html`** num navegador de computador. Esta versão autónoma funciona offline, sem servidor, para ver e experimentar o presente. Os dados de demonstração que introduzires são guardados apenas no navegador onde abrires a pré-visualização. Não é a versão de instalação PWA.

## Funcionalidades da V1

- **Início:** estatísticas pessoais, próximos serviços e últimos voos.
- **O bilhete — Sempre 20 Anos:** nome César Ricardo, frase bem-humorada e percurso simbólico dos tempos da universidade a muitos anos no ar. Pode imprimir-se ou partilhar a mensagem, sem voos reais.
- **Escalas:** serviços do tipo Voo, Reserva, Folga, Férias, Formação e Outro; calendário mensal; adicionar, editar, apagar, importar CSV e exportar calendário `.ics`.
- **Diário de voo:** data, origem, destino, horas `h:mm`, aeronave (opcional), notas, estatísticas, exportação CSV.
- **Fusos horários:** relógios UTC, Lisboa, Londres, Madrid, Paris, Nova Iorque, Boston, Luanda, São Paulo e outros locais.
- **Destinos:** notas pessoais por cidade, ligação para pesquisar a cidade no Google Maps.
- **Dados:** armazenamento local no dispositivo, backup/restauro JSON, tamanho de letra ajustável.
- **Offline:** PWA com cache de recursos após a primeira visita online.
- **Ícone próprio:** novo emblema CR com avião em ascensão e cápsula azul, no PWA e nos recursos nativos Android (não usa marcas de companhias aéreas).

## Para instalar a WebApp (PWA)

1. Cria um repositório GitHub para este projeto (por exemplo, `Almeida_Tavares_Air_Force`).
2. Coloca **o conteúdo desta pasta** na raiz do repositório (`index.html`, `src`, `public`, `.github`, etc.). Não coloques uma pasta adicional à volta destes ficheiros.
3. No separador **Actions**, executa `Almeida Tavares Air Force - WebApp e Android APK` (ou faz push para `main`).
4. Em **Settings → Pages → Build and deployment**, seleciona **GitHub Actions** como origem.
5. Depois de a ação terminar, a WebApp ficará em `https://UTILIZADOR.github.io/REPOSITORIO/`.
6. No Chrome Android, abre esse endereço e escolhe **Adicionar ao ecrã principal** / **Instalar aplicação**.

As instalações PWA recebem os ficheiros novos pelo site; ao atualizar o código da app, **altera também a variável `VERSION` em `public/sw.js`** para forçar a substituição da cache offline.

## Para compilar APK no GitHub

1. Carrega o projeto para o GitHub.
2. Abre **Actions → Almeida Tavares Air Force - WebApp e Android APK → Run workflow**.
3. Abre a execução concluída → **Artifacts → `Almeida-Tavares-Air-Force-Android-APK`**.
4. Obténs `Almeida-Tavares-Air-Force-TESTE.apk`, compilado automaticamente.

> **IMPORTANTE: atualizações Android sem desinstalar**
>
> O APK de **TESTE** usa a chave debug do ambiente de compilação, que pode mudar entre execuções. Por isso **não está garantido que atualize o anterior**. Para a app manter os dados e aceitar atualizações no futuro, configura **uma chave de assinatura de release privada e fixa** desde a primeira instalação. A Action está preparada para gerar automaticamente `Almeida-Tavares-Air-Force-ATUALIZAVEL.apk` assim que tiver os quatro GitHub Secrets descritos abaixo. Instala sempre a variante **ATUALIZAVEL**, assinada pela mesma chave, nas atualizações seguintes.

### Criar uma chave de assinatura (guardar em local seguro)

É preciso ter Java (`keytool`) disponível no computador. Executa uma única vez:

```bash
keytool -genkeypair -v -keystore cesar-ricardo-release.jks -alias cesar -keyalg RSA -keysize 3072 -validity 10000
```

Cria passwords próprias, guarda-as num gestor de passwords e faz uma cópia de segurança da chave `.jks`. **Nunca publiques a chave nem as passwords no repositório.** Não se deve alterar esta chave entre versões.

Converte o ficheiro para Base64 numa única linha:

- Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes('cesar-ricardo-release.jks'))`
- macOS/Linux: `base64 -w 0 cesar-ricardo-release.jks` (no macOS, `base64 < cesar-ricardo-release.jks | tr -d '\n'`)

Em **GitHub → Settings → Secrets and variables → Actions → New repository secret**, cria:

| Nome do secret | Conteúdo |
|---|---|
| `RJP_KEYSTORE_B64` | Texto Base64 da chave `.jks` |
| `RJP_STORE_PASSWORD` | Password da chave |
| `RJP_KEY_ALIAS` | `cesar` (ou o alias escolhido) |
| `RJP_KEY_PASSWORD` | Password do alias (muitas vezes igual à da chave) |

Executa de novo a Action. Instala a variante **ATUALIZAVEL.apk**. As próximas versões vão manter `appId=pt.rjp.cesarricardo.semprenoar`, reutilizar a mesma assinatura e incrementar `versionCode` automaticamente (série 1.2.x: 10000 + número da execução GitHub). Assim, em condições normais, substituem a app instalada preservando os dados locais.

**Não confundas PWA e APK:** são instalações separadas e **não partilham automaticamente os dados**. Usa *Definições → Exportar backup* e *Importar backup* para mudar de dispositivo ou entre instalações.

## Desenvolver no computador (Node.js 22+)

```bash
npm install
npm run dev
```

Para gerar WebApp/Android localmente:

```bash
npm run build
npx cap add android      # apenas na primeira vez
python3 scripts/install_android_icons.py
npx cap sync android
npx cap open android
```

O workflow instala também os ícones personalizados em `android/` e gera `android/` durante a compilação e por isso esta pasta não faz parte do ZIP. Se desenvolveres no Android Studio, mantém o projeto gerado no teu ambiente de trabalho. O `appId` não deve mudar entre versões. O APK ainda não foi compilado neste ambiente; o workflow é executado na tua conta GitHub após carregar o projeto.

Para atualizar a pré-visualização estática depois de editares o código:

```bash
python3 scripts/criar-preview.py
```

## Modelo CSV de importação

Separador `;`, cabeçalhos: `tipo;inicio;fim;trajeto;nota`; datas em formato `AAAA-MM-DDThh:mm`, **hora local**. O exemplo está em `public/exemplos/escalas-modelo.csv`. Importações acrescentam entradas; não fazem sincronização com sistemas TAP. Os eventos `.ics` exportados utilizam horas locais *flutuantes* e devem ser verificados no calendário onde forem importados, sobretudo se houver mudanças de fuso horário.

## Mudanças na V1.2.1 — correção da compilação Android

- Atualizada a ação do Android SDK de `android-actions/setup-android@v3` para `android-actions/setup-android@v4`.
- Definido explicitamente `packages: 'platform-tools'`, evitando a tentativa de instalação do pacote descontinuado `tools` (erro `Failed to find package 'tools'`).
- Corrigido o script `scripts/prepare_android.py`: o `versionName` é agora lido da versão de `package.json`, enquanto o `versionCode` continua a aumentar com o número da execução.
- Versão 1.2.1 atualizada no projeto, WebApp, pré-visualização e cache offline.
- Mantidos o `appId`, o nome, o emblema CR, os dados locais e as funcionalidades da V1.2.0.

**Para corrigir uma instalação existente no GitHub:** substitui o ficheiro `.github/workflows/build.yml` pelo desta versão e volta a executar a ação. Se quiseres que também apareça a versão 1.2.1, atualiza o projeto completo. Não é necessário desinstalar a app já instalada, desde que uses o APK assinado com a mesma chave privada.

## Mudanças na V1.2.0

- Novo nome oficial: **Almeida Tavares Air Force**, com o lema **Sempre no Ar**.
- Identidade da app, bilhete, PWA e nome apresentado no Android atualizados; **César Ricardo continua identificado como o destinatário do cartão**.
- Conservado o emblema pessoal CR já escolhido como ícone; os iniciais do passageiro não foram alterados.
- O identificador Android `pt.rjp.cesarricardo.semprenoar` e a `STORAGE_KEY` original permanecem iguais, para não quebrar futuras atualizações nem perder dados locais.
- Versão incrementada para 1.2.0 e cache offline renovada.

## Mudanças na V1.1.0

- Mensagem definitiva: **Sempre no ar. Se faltar a potência, há sempre um comprimido azul.**
- Retiradas as referências a aniversário do bilhete, da partilha, do ecrã principal e da interface.
- Emblema CR integrado no ecrã, no cartão, no PWA e como ícone Android (adaptativo e clássico).
- Mantida a chave `STORAGE_KEY` original para conservar os dados locais em atualizações corretas.

## Limites e privacidade

Os dados ficam no armazenamento local do navegador/WebView e não são enviados a servidores da app. Ao limpar os dados da aplicação, desinstalá-la ou mudar de navegador, podem perder-se; por isso, exporta backups frequentemente. Os backups JSON não são cifrados: guarda-os num sítio privado. Nenhuma função foi concebida para navegação, performance, peso e centragem, cálculo de combustível, controlo de fadiga, cumprimento de FTL ou decisões operacionais. Não instalar ou utilizar em EFB/equipamento da companhia sem autorização. Consulta as normas e procedimentos oficiais do operador.

**«Sempre no ar. Se faltar a potência, há sempre um comprimido azul.»**
