import type { Metadata } from "next";

import { GameShell } from "@/components/game/GameShell";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { getServerDictionary } from "@/lib/i18n/server";
import { TERMS_VERSION } from "@/lib/constants";
import { OPERATOR_NAME, CONTACT_EMAIL, GOVERNING_LAW } from "@/lib/legal/identity";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const d = await getServerDictionary();
  return { title: `${d.legal.termsPage.title} — ${d.common.brand}` };
}

export default async function TermsPage() {
  const d = await getServerDictionary();
  const p = d.legal.termsPage;
  return (
    <GameShell>
      <LegalDoc
        title={p.title}
        intro={p.intro}
        sections={p.sections}
        effective={`${d.legal.lastUpdated}: ${TERMS_VERSION}`}
        identity={{
          operatedByLabel: d.legal.identity.operatedBy,
          operator: OPERATOR_NAME,
          governedByLabel: d.legal.identity.governedBy,
          jurisdiction: GOVERNING_LAW,
          contactLabel: d.legal.identity.contact,
          email: CONTACT_EMAIL,
        }}
        backHome={d.legal.backHome}
      />
    </GameShell>
  );
}
