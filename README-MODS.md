# Aeterna — branche des mods

Cette branche sert à publier le contenu du modpack séparément du code du launcher.

## Fonctionnement prévu

- Ajouter ou remplacer un fichier `.jar` dans `modpack/mods/` : GitHub Actions régénère `manifest/manifest-auto.json`.
- Supprimer un fichier `.jar` de `modpack/mods/` : il disparaît du prochain manifeste généré.
- Le manifeste calcule automatiquement la taille et le SHA-1 de chaque fichier.
- Les fichiers du jeu sont installés dans le dossier `mods/` du profil Aeterna.

## Important

Le manifeste automatique est distinct de `manifest/manifest.json` afin de ne pas écraser le manifeste existant pendant la préparation.

**Pour que cette branche représente le modpack complet**, il faudra y placer tous les mods voulus dans `modpack/mods/`. Le manifeste automatique ne sera pas complet tant que ce dossier ne contient pas tous les fichiers du pack.

La branche `mods` ne met pas encore à jour le programme Electron lui-même. Le code du launcher doit ensuite être relié à l'URL suivante :

`https://raw.githubusercontent.com/zozo381169/Aeterna-Launcher-off/mods/manifest/manifest-auto.json`

L'updater devra aussi retirer uniquement les anciens fichiers qu'il a lui-même gérés et qui ne figurent plus dans le manifeste, sans supprimer les mods personnels ni d'autres fichiers.
