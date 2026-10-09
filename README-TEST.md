# Aeterna Launcher — branche de test

Cette branche contient des manifestes **de préparation**, pas encore le modpack ni un système de mise à jour opérationnel.

- Minecraft 1.20.1 / Forge 47.4.10
- Serveur : `play2.eternalzero.cloud:26506`
- `manifest/manifest.json` : mods obligatoires (vide tant que fichiers, SHA-1, URL et droits de distribution ne sont pas vérifiés).
- `manifest/optional-mods.json` : catalogue indépendant des mods optionnels (vide).
- `manifest/shaders.json` : catalogue indépendant des shaders (vide).
- `manifest/launcher-update.json` : canal de test, sans installateur publié.

## Étapes restantes

1. Inventorier et vérifier les JAR du modpack.
2. Héberger les fichiers redistribuables, et référencer les sources officielles pour les autres.
3. Adapter le code réel du launcher pour lire ces manifestes et contrôler les SHA.
4. Tester l'installation de Forge et du modpack sur Windows.
5. Configurer electron-builder et GitHub Actions pour une version de test Windows.

**Ne pas annoncer une mise à jour fonctionnelle avant intégration et tests.**
