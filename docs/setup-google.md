# Connecter tes comptes Gmail — projet Google Cloud (une seule fois)

Comme pour Outlook, une seule app Google gratuite suffit pour tous tes
comptes Gmail. En restant en mode "Test", Google ne demande **aucune**
vérification de sécurité — c'est le mode adapté à un usage strictement
personnel.

## 1. Créer le projet

1. [console.cloud.google.com](https://console.cloud.google.com/) →
   sélecteur de projet en haut → **"Nouveau projet"** → nomme-le
   `MailGuard` → Créer.

## 2. Activer l'API Gmail

1. Menu ☰ → **"APIs et services"** → **"Bibliothèque"**.
2. Cherche **"Gmail API"** → **"Activer"**.

## 3. Configurer l'écran de consentement OAuth

1. **"APIs et services"** → **"Écran de consentement OAuth"**.
2. Type d'utilisateur : **"Externe"**.
3. Renseigne le nom de l'app (`MailGuard`), un email de contact (le
   tien), rien d'autre n'est obligatoire.
4. Section **"Utilisateurs test"** : ajoute chacune de tes adresses
   Gmail que tu comptes connecter. **C'est l'étape qui évite toute
   vérification Google** — tant que tu restes en mode "Test" avec ces
   comptes listés, il n'y a pas de processus de review à faire.

## 4. Créer les identifiants OAuth

1. **"APIs et services"** → **"Identifiants"** → **"+ Créer des
   identifiants"** → **"ID client OAuth"**.
2. Type d'application : **"Application Web"**.
3. **Origines JavaScript autorisées** : `http://127.0.0.1:3000`
4. **URI de redirection autorisés** :
   `http://127.0.0.1:3000/api/auth/google/callback`
5. Crée, puis copie **"ID client"** et **"Code secret du client"**.

## 5. Renseigner les variables d'environnement

Dans `.env.local` :

```
GOOGLE_CLIENT_ID=<l'ID client copié à l'étape 4>
GOOGLE_CLIENT_SECRET=<le code secret copié à l'étape 4>
```

Relance `npm run dev`, page **Comptes** → **"Connecter un compte
Gmail"**. Au premier compte, Google affiche un écran "Cette application
n'est pas vérifiée" — c'est normal en mode Test, clique **"Avancé"**
puis **"Accéder à MailGuard (non sécurisé)"**. Répète pour chaque
compte Gmail (en ajoutant chaque adresse aux utilisateurs test à
l'étape 3 si elle n'y est pas déjà).

## Passer en Production (sinon reconnexion tous les 7 jours)

En mode Test, Google fait expirer **chaque refresh token 7 jours après sa
délivrance**, même si l'app tourne en continu : tous les comptes Gmail
passent en « À reconnecter » une semaine après chaque connexion.

Pour un usage perso (moins de 100 comptes), passe l'app en Production
sans vérification :

1. **Branding** : renseigne une page d'accueil et un lien vers une
   politique de confidentialité (ex. le dépôt GitHub et son
   `PRIVACY.md`), puis ajoute leur domaine dans **Domaines autorisés**.
2. **Audience** → **Publier l'application** → **Confirmer**.
3. Reconnecte une dernière fois chaque compte Gmail (les tokens émis en
   mode Test gardent leur expiration de 7 jours).

L'écran « Google n'a pas validé cette application » reste affiché à la
connexion (scopes Gmail restreints, app non vérifiée) — clique
**Paramètres avancés** → **Accéder à MailGuard**. Les tokens n'expirent
plus ensuite, sauf révocation ou mot de passe changé.
