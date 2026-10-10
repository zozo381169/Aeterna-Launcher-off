# Audit local des mods Forge (sans lancement du jeu)

Cet outil lit les 108 fichiers JAR originaux, vérifie leurs tailles et empreintes SHA-1, extrait les identifiants déclarés dans `META-INF/mods.toml`, signale les identifiants en double et les dépendances obligatoires absentes.

## Sur Windows

Installer Python 3.11 ou plus récent, puis, depuis la racine du dépôt :

```powershell
python scripts/audit-forge-local.py "C:\chemin\vers\mods"
```

Le rapport sera écrit dans `manifest/audit-forge-local.json`. Pour le partager sans exposer les JARs, envoyer seulement ce JSON.

**Important :** ce contrôle ne lance pas Minecraft, ne résout pas complètement les plages de versions Forge et ne prouve pas que les mods sont compatibles. Il nécessite les JARs d'origine. Le manifeste actif ne doit pas être activé tant que les 108 fichiers n'ont pas une source conforme.
