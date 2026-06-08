import type { Metadata } from "next";

import { GameShell } from "@/components/game/GameShell";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { getServerDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const d = await getServerDictionary();
  return { title: `${d.legal.aboutPage.title} — ${d.common.brand}` };
}

export default async function AboutPage() {
  const d = await getServerDictionary();
  const p = d.legal.aboutPage;
  return (
    <GameShell>
      <LegalDoc
        title={p.title}
        intro={p.intro}
        sections={p.sections}
        backHome={d.legal.backHome}
      />
    </GameShell>
  );
}
