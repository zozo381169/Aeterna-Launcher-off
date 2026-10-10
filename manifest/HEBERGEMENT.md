# Hébergement hybride Aeterna — branche de test

## Décision
- Mods développés par Aeterna et distribuables par leur auteur : **GitHub Releases** du dépôt `zozo381169/Aeterna-Launcher-off` (ou dépôt de distribution distinct).
- Mods tiers : URL HTTPS du fichier exact sur Modrinth, CurseForge ou site officiel **seulement si les conditions d'utilisation autorisent ce mode de téléchargement**. Ne jamais inventer une URL à partir du nom.
- Inventaire de référence : `manifest/manifest-inventaire.json` (107 fichiers, SHA-1 et tailles). Les champs `url: null` sont intentionnels.
- Manifeste actif : `manifest/manifest.json` reste sans fichiers jusqu'à la validation des URLs ; ne pas y copier les 107 entrées sans sources.

## Étapes
1. Identifier et confirmer les mods réellement développés par Aeterna ; les noms ne prouvent pas la propriété. Vérifier la licence et les autorisations de redistribution pour chaque fichier.
2. Pour chaque mod Aeterna autorisé, ouvrir **Releases → Draft a new release** sur GitHub, utiliser un tag tel que `mods-aeterna-v0.1.0-test`, joindre les fichiers JAR **originaux** puis publier la release. Ne pas ajouter les JAR à l'historique Git.
3. Copier l'URL HTTPS de téléchargement de chaque asset publié et l'inscrire dans la bonne entrée d'inventaire. Ne pas modifier `sha1` ni `size` sans recalcul sur les octets téléchargés.
4. Pour les mods tiers, obtenir les liens officiels vers les versions exactes. Vérifier taille + SHA-1 de chaque téléchargement et sa compatibilité Minecraft 1.20.1 / Forge 47.4.10.
5. N'activer les entrées dans `manifest/manifest.json` que lorsque leurs URLs sont renseignées et testées ; une entrée invalide doit provoquer une erreur claire, pas un téléchargement silencieux.
6. Tester sur un dossier de jeu vierge, puis l'intégration Electron, Forge, shaders et mods optionnels avant une release Windows.

## Contrôles et limites
- Ne pas confondre **107 fichiers inventoriés** avec **107 liens utilisables** : il reste 107 URLs manquantes.
- Certains fichiers peuvent être des correctifs locaux ou des bibliothèques : examiner les dépendances et les conflits avant distribution.
- Un mod de musique de plus de 300 Mo figure dans l'inventaire ; vérifier particulièrement les droits sur les contenus audio.
- Les assets GitHub Releases sont publics pour un dépôt public ; ne pas y publier de secrets ou de fichiers sans droit de distribution.
- Cette étape ne crée aucune release binaire et ne garantit pas encore l'installation automatique.
