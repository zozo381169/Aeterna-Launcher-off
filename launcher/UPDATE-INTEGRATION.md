# Aeterna — mise à jour des fichiers (prototype de test)

Ce module est une **base Node.js**, non encore reliée à l'interface Electron ni testée sur une installation complète.

## Exemple d'intégration dans le processus principal Electron

```js
const path = require('node:path');
const os = require('node:os');
const { applyManifest } = require('./launcher/update-manifest');

const gameDir = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), '.aeterna');
const manifestUrl = 'https://raw.githubusercontent.com/zozo381169/Aeterna-Launcher-off/test/manifestes-v1/manifest/manifest.json';

await applyManifest({
  manifestUrl,
  gameDir,
  onProgress: ({file, bytes, total}) => console.log(file, total ? Math.round(bytes / total * 100) : 100, '%')
});
```

### Entrée attendue dans `manifest/manifest.json`

```json
{
  "path": "mods/nom-du-mod.jar",
  "url": "https://exemple.org/fichier.jar",
  "sha1": "40 caracteres hexadecimaux",
  "size": 12345
}
```

**Important :** ne pas inventer les URLs ni les SHA-1. Vérifier les droits de redistribution des mods. Le module ne supprime pas les mods supplémentaires et n'installe pas Forge. Les manifestes optionnels et shaders sont des catalogues séparés : leur interface et leur logique d'installation restent à intégrer.

Ce code est un prototype de test : des tests Windows et une revue de sécurité sont nécessaires avant distribution.
