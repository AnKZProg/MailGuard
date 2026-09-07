# MailGuard

Dashboard local et privé pour trier, mettre en quarantaine et surveiller
plusieurs boîtes Gmail et Outlook/Microsoft 365 depuis un seul endroit.
Tourne uniquement sur `localhost` — usage mono-utilisateur, aucune donnée
ne quitte la machine hormis les appels aux API Google/Microsoft.

## Principe de sécurité

Le contenu d'un mail est une donnée mesurée, jamais une instruction. Le
moteur de classification (`src/lib/classify/`) ne reçoit que des signaux
structurés (en-têtes, domaine expéditeur, SPF/DKIM/DMARC, mots-clés du
sujet) — jamais le corps du mail pendant la synchronisation. Rien issu
d'un mail n'est exécuté, interprété comme une commande, ni utilisé pour
suivre un lien automatiquement.

Rien n'est jamais supprimé définitivement par le moteur automatique : tout
mail suspect part d'abord en quarantaine (délai configurable), et la purge
automatique déplace vers la corbeille du fournisseur, jamais une
suppression irréversible.

## Démarrage

```powershell
npm install
copy .env.example .env.local   # puis remplir les clés (voir ci-dessous)
npm run db:push
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Configuration requise

Deux enregistrements OAuth gratuits, à faire une seule fois :

- **Gmail** — projet Google Cloud Console, écran de consentement en mode
  "Test" (pas de vérification nécessaire pour un usage perso).
- **Outlook/Microsoft 365** — une app Azure/Entra ID unique couvre tous
  tes comptes Outlook, y compris un mélange de comptes personnels et
  professionnels/scolaires. Procédure détaillée : `docs/setup-azure.md`.

Voir `.env.example` pour la liste complète des variables requises. Le
serveur refuse de démarrer si `MAILGUARD_ENCRYPTION_KEY` (clé de
chiffrement des tokens OAuth, AES-256-GCM) est absente ou mal formée.

## Particularité d'environnement Windows (chemin avec `&`)

Ce dossier vit sous un chemin contenant un `&`
(`...\Claude\MailGuard`). Sur Windows, `npm run <script>` invoque
`cmd.exe` par défaut, qui **coupe la commande au niveau du `&`** et casse
toute résolution de binaire (`next`, etc.). Le fichier `.npmrc` de ce
projet force `script-shell` vers Git Bash pour contourner ce problème —
ne pas le supprimer, et si le projet est un jour déplacé vers un chemin
sans caractère spécial, il peut être retiré sans risque.

## Tests

```powershell
npm test
```

Couverture ciblée : ≥ 95 % sur `src/lib/classify/`, ≥ 80 % globalement.
