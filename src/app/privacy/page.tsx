import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Confidentialité & conditions — MailGuard" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[14px] font-semibold text-text-primary">{title}</h2>
      <div className="flex flex-col gap-2 text-[13px] leading-relaxed text-text-secondary">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center border-b border-border-subtle px-6">
        <h1 className="text-[13px] font-semibold text-text-primary">Confidentialité &amp; conditions d&apos;utilisation</h1>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
        <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface-1 px-4 py-3.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
          <p className="text-[13px] leading-relaxed text-text-secondary">
            MailGuard est un logiciel <strong className="text-text-primary">local et auto-hébergé</strong> : il tourne sur cette
            machine, sous ce compte utilisateur, sans compte MailGuard, sans serveur MailGuard, et sans que quiconque
            d&apos;autre que toi n&apos;y ait accès. Ce qui suit décrit ce que fait réellement le code, pas une politique
            générique.
          </p>
        </div>

        <Section title="Quelles données MailGuard voit">
          <p>
            En connectant un compte Gmail ou Outlook, tu autorises MailGuard à lire et modifier ce compte via
            l&apos;API officielle de Google ou Microsoft (OAuth — tu peux révoquer cet accès à tout moment depuis les
            paramètres de sécurité de ton compte Google/Microsoft). Concrètement, MailGuard récupère les
            <strong className="text-text-primary"> en-têtes et métadonnées</strong> de tes mails (expéditeur, sujet,
            date, indicateurs d&apos;authentification SPF/DKIM/DMARC, présence de pièces jointes) pour les classer, les
            organiser et auditer les règles de sécurité du compte (transfert automatique suspect notamment).
          </p>
        </Section>

        <Section title="Ce que MailGuard ne fait jamais">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-text-primary">Le corps des mails n&apos;est jamais lu pour la classification.</strong>{" "}
              Le moteur ne se base que sur des signaux structurés (en-têtes, domaine, motifs connus) — jamais sur le
              contenu du message. Ça évite qu&apos;un mail malveillant puisse manipuler le classement en y insérant des
              instructions.
            </li>
            <li>
              <strong className="text-text-primary">Rien n&apos;est envoyé à un tiers.</strong> Aucune télémétrie,
              aucun analytics, aucun appel réseau en dehors des API officielles Google/Microsoft que tu as toi-même
              configurées.
            </li>
            <li>
              <strong className="text-text-primary">La quarantaine ne supprime jamais définitivement.</strong> Un mail
              classé spam/phishing part dans la Corbeille native du fournisseur (Gmail/Outlook) — récupérable
              normalement, jamais effacé de force par l&apos;automatisation.
            </li>
          </ul>
        </Section>

        <Section title="Où sont stockées tes données">
          <p>
            Tout reste dans une base SQLite locale (<code className="rounded bg-surface-2 px-1 py-0.5 text-[12px]">data/mailguard.db</code>),
            sur cette machine. Les jetons OAuth (ce qui permet à MailGuard de rester connecté à tes comptes) sont
            chiffrés au repos avec AES-256-GCM, avec une clé que <strong className="text-text-primary">toi seul</strong> possèdes
            (générée localement, jamais transmise nulle part). Perdre cette clé revient à devoir reconnecter tes
            comptes ; elle ne peut être récupérée par personne d&apos;autre, y compris les développeurs du projet.
          </p>
        </Section>

        <Section title="Tes responsabilités">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Garder la clé de chiffrement (et le fichier <code className="rounded bg-surface-2 px-1 py-0.5 text-[12px]">.env.local</code>) en sécurité — c&apos;est ce qui protège tes jetons d&apos;accès.</li>
            <li>Créer et gérer toi-même les identifiants OAuth (Google Cloud Console / Azure) utilisés pour te connecter — MailGuard n&apos;en fournit aucun.</li>
            <li>Comprendre que le moteur de classification peut se tromper : vérifie les décisions importantes, surtout au début (le Mode observation existe pour ça).</li>
          </ul>
        </Section>

        <Section title="Licence et garantie">
          <p>
            MailGuard est distribué sous licence MIT, <strong className="text-text-primary">sans garantie d&apos;aucune
            sorte</strong>. Le code est fourni tel quel ; l&apos;utilisation de ce logiciel sur tes propres comptes mail
            reste sous ta seule responsabilité. Voir le fichier <code className="rounded bg-surface-2 px-1 py-0.5 text-[12px]">LICENSE</code> du
            dépôt pour le texte complet.
          </p>
        </Section>
      </div>
    </div>
  );
}
