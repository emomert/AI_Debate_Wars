import type { Metadata } from "next";
import Link from "next/link";

import { GameShell } from "@/components/game/GameShell";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { getServerDictionary } from "@/lib/i18n/server";
import { OPERATOR_NAME, CONTACT_EMAIL } from "@/lib/legal/identity";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const d = await getServerDictionary();
  return { title: `${d.legal.contactPage.title} — ${d.common.brand}` };
}

export default async function ContactPage() {
  const d = await getServerDictionary();
  const p = d.legal.contactPage;
  return (
    <GameShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{p.title}</h1>
        <p className="mt-4 text-ink/75">{p.intro}</p>

        <GamePanel className="mt-5">
          <p className="text-sm text-ink/80">
            {p.reachUs}{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-arcade-blue underline decoration-2 underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-2 text-sm text-ink/70">
            {p.operatedBy}{" "}
            <strong className="font-extrabold text-ink">{OPERATOR_NAME}</strong>.
          </p>
        </GamePanel>

        <div className="mt-5">
          <Link href="/">
            <ArcadeButton variant="neutral-white" size="sm">
              {d.legal.backHome}
            </ArcadeButton>
          </Link>
        </div>
      </div>
    </GameShell>
  );
}
