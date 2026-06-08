import type { Metadata } from "next";

import { GameShell } from "@/components/game/GameShell";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { getServerDictionary } from "@/lib/i18n/server";

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
        effective={d.legal.effective}
        reviewNote={d.legal.reviewNote}
        backHome={d.legal.backHome}
      />
    </GameShell>
  );
}
