# Connecter tes comptes Outlook — enregistrement Azure (une seule fois)

Ceci n'est pas contournable : Microsoft impose depuis mai 2025 qu'un outil
tiers passe par OAuth pour accéder à un compte Outlook.com/Microsoft 365,
plus de mot de passe d'application possible. La bonne nouvelle : une seule
app Azure gratuite suffit pour **tous** tes comptes Outlook, y compris un
mélange de comptes personnels (outlook.com/hotmail/live) et
professionnels/scolaires (Microsoft 365).

Compte à rebours : ~5 minutes, gratuit, pas de carte bancaire.

## 1. Créer l'inscription

1. Va sur [portal.azure.com](https://portal.azure.com/) et connecte-toi
   avec n'importe lequel de tes comptes Microsoft.
2. Cherche **"Inscriptions d'applications"** (ou *"App registrations"*)
   dans la barre de recherche en haut.
3. Clique **"+ Nouvelle inscription"**.
4. Renseigne :
   - **Nom** : `MailGuard` (libre, juste pour toi)
   - **Types de comptes pris en charge** : choisis
     **"Comptes dans un annuaire d'organisation quelconque et comptes
     Microsoft personnels"** — c'est l'option qui couvre à la fois tes
     comptes perso et pro/scolaires en une seule app.
   - **URI de redirection** : type **Web**, valeur :
     `http://127.0.0.1:3000/api/auth/microsoft/callback`
5. Clique **"S'inscrire"**.

## 2. Récupérer l'ID client

Sur la page **"Vue d'ensemble"** qui s'affiche, copie la valeur
**"ID d'application (client)"** — un identifiant du type
`a1b2c3d4-....`. C'est ta variable `MICROSOFT_CLIENT_ID`.

## 3. Créer le secret client

1. Menu de gauche → **"Certificats et secrets"**.
2. Onglet **"Secrets client"** → **"+ Nouveau secret client"**.
3. Description libre (`mailguard`), expiration 24 mois (le max
   raisonnable — il faudra en régénérer un à cette échéance).
4. Clique **"Ajouter"**, puis **copie immédiatement la colonne
   "Valeur"** (pas "ID secret") — elle ne sera plus jamais affichée
   après avoir quitté la page. C'est ta variable
   `MICROSOFT_CLIENT_SECRET`.

## 4. Autoriser les bonnes permissions

1. Menu de gauche → **"Autorisations API"**.
2. **"+ Ajouter une autorisation"** → **Microsoft Graph** →
   **"Autorisations déléguées"**.
3. Recherche et coche, une par une :
   - `Mail.ReadWrite`
   - `MailboxSettings.Read`
   - `User.Read` (généralement déjà présente par défaut)
   - `offline_access`
4. Clique **"Ajouter des autorisations"**.

Pas besoin de "consentement de l'administrateur" pour des comptes
personnels ou une inscription mono-tenant d'essai — le consentement se
fait directement au moment où tu te connectes depuis MailGuard.

## 5. Renseigner les variables d'environnement

Dans `.env.local` à la racine du projet :

```
MICROSOFT_CLIENT_ID=<l'ID d'application copié à l'étape 2>
MICROSOFT_CLIENT_SECRET=<la valeur du secret copiée à l'étape 3>
```

Relance `npm run dev`, va sur la page **Comptes**, clique **"Connecter
un compte Outlook"** : Microsoft affiche l'écran de connexion standard,
tu choisis le compte (perso ou pro), tu acceptes les permissions, et tu
es redirigé vers MailGuard avec le compte ajouté. Répète l'opération
pour chacun de tes comptes Outlook — même app Azure à chaque fois.

## Limite connue

Microsoft Graph n'expose pas la notion de "transfert au niveau boîte"
pour les comptes grand public (c'est une fonctionnalité Exchange Online
uniquement). L'audit sécurité de MailGuard couvre les **règles de boîte
de réception** (`inbox rules`) qui redirigent ou transfèrent — c'est le
vecteur de persistance le plus courant après un piratage — mais ne peut
pas voir un éventuel transfert configuré au niveau du domaine par un
administrateur. Ce n'est pertinent que pour des comptes Microsoft 365
professionnels gérés par une organisation, pas pour tes comptes perso.
