import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { entries, packingSubmissions, weeks } from "@/lib/schema";
import { WeekEditor, type SubmissionInfo } from "@/components/week-editor";

export const dynamic = "force-dynamic";

export default async function WeekPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const weekId = Number(id);
  const db = await getDb();
  const [week] = await db.select().from(weeks).where(eq(weeks.id, weekId));
  if (!week) notFound();

  const rows = await db.select().from(entries).where(eq(entries.weekId, weekId)).orderBy(asc(entries.name));
  const subs = await db
    .select()
    .from(packingSubmissions)
    .where(eq(packingSubmissions.weekId, weekId))
    .orderBy(asc(packingSubmissions.createdAt));

  // Último envío del formulario por empleada
  const lastSub: Record<number, SubmissionInfo> = {};
  for (const s of subs) {
    lastSub[s.employeeId] = {
      days: JSON.parse(s.days),
      doubleDays: JSON.parse(s.doubleDays),
      email: s.email,
      at: s.createdAt,
      count: (lastSub[s.employeeId]?.count ?? 0) + 1,
    };
  }

  return <WeekEditor key={`${week.id}-${week.closed}-${rows.length}`} week={week} entries={rows} submissions={lastSub} />;
}
