# Aeterna — manifeste et mise à jour (branche de test)

Le manifeste reprend les fonctions utiles du format Aethoria, adaptées à Aeterna :
- `files` : fichiers obligatoires avec URL HTTPS, taille et SHA-1 ;
- `optionalMods` : catalogue de mods facultatifs et leurs dépendances (`requires`) ;
- `keepExisting: true` : conserve un fichier existant sans écraser les réglages locaux ;
- `removeFiles` : supprime explicitement les chemins listés ;
- `deleteExtraIn` : nettoie les JAR non référencés dans les dossiers déclarés ;
- `links`, `news`, `authNotice` : métadonnées destinées à l'interface du launcher.

## Exemple d'appel côté processus principal Electron

```js
const path = require('node:path');
const os = require('node:os');
const { applyManifest } = require('./launcher/update-manifest');

const gameDir = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), '.aeterna');
const manifestUrl = 'https://raw.githubusercontent.com/zozo381169/Aeterna-Launcher-off/test/manifestes-v1/manifest/manifest.json';

await applyManifest({
  manifestUrl,
  gameDir,
  selectedOptionalMods: ['xaeros-minimap', 'just-zoom'],
  onProgress: ({ file, bytes, total }) => console.log(file, total ? Math.round(bytes / total * 100) : 100, '%')
});
```

## État d'intégration

Le dépôt accessible ici ne contient pas le code source complet de l'application Electron distribuée : il n'y a notamment pas de `package.json`, de point d'entrée Electron ni de pont IPC/UI dans cette branche. Le manifeste et le module de mise à jour sont préparés, mais `links`, `news`, `authNotice` et la sélection des mods facultatifs ne sont pas encore reliés à l'interface. Il faut intégrer ces appels dans le vrai projet puis effectuer un test Windows avant de dire que le launcher distribué fonctionne avec ces fonctions.

## Précautions

- Le dossier `.aeterna` doit être réservé à cette instance : `deleteExtraIn: ["mods"]` supprime les JAR non référencés dans le catalogue du manifeste.
- Les fichiers sont vérifiés par taille et SHA-1 avant remplacement.
- Les fichiers marqués `keepExisting: true` sont conservés s'ils existent déjà.
- `mods/MenuAeterna-Final-v2.jar` reste explicitement supprimé.
- Ces modifications sont sur `test/manifestes-v1`, pas sur `main`.
