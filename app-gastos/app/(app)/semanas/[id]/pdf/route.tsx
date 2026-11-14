import { readFile } from "node:fs/promises";
import path from "node:path";
import { asc, eq } from "drizzle-orm";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { entries, weeks, type Entry, type Role } from "@/lib/schema";
import { ROLE_LABELS, ROLE_ORDER, addDays, gross, money, toPay, weekLabel } from "@/lib/calc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INK = "#2d333d";
const SOFT = "#6b7280";
const LINE = "#e4e0da";
const SALMON = "#e2674d";
const PAPER = "#f6f4f1";

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 10, color: INK },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 22 },
  logo: { width: 58, height: 58, marginRight: 14 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 11, color: SOFT, marginTop: 3 },
  totalBox: { marginLeft: "auto", alignItems: "flex-end", backgroundColor: INK, color: "white", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  totalLabel: { fontSize: 8, letterSpacing: 1, color: "#cfd3da" },
  totalValue: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 2 },
  section: { marginBottom: 16 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 2, borderBottomColor: SALMON, paddingBottom: 4, marginBottom: 2 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  colHead: { flexDirection: "row", paddingVertical: 4, color: SOFT, fontSize: 8, letterSpacing: 0.5 },
  row: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: LINE, alignItems: "center" },
  cName: { flex: 1.4 },
  cDetail: { flex: 1.6, color: SOFT },
  cAdv: { flex: 0.9, textAlign: "right" },
  cPay: { flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" },
  note: { fontSize: 8, color: SOFT, marginTop: 1 },
  subtotal: { flexDirection: "row", justifyContent: "flex-end", paddingTop: 5 },
  summary: { marginTop: 8, backgroundColor: PAPER, borderRadius: 6, padding: 12 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  sumTotal: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: INK, marginTop: 4, paddingTop: 6 },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: SOFT },
});

function detail(e: Entry): string {
  const hs = String(e.hours).replace(".", ",");
  switch (e.role) {
    case "cocina": return `${hs} hs × ${money(e.rate)}`;
    case "empaque": return `${e.days} ${e.days === 1 ? "día" : "días"} × ${money(e.rate)}`;
    case "fijo": return "Sueldo semanal";
    case "delivery": return "";
  }
}

function Payroll({ startDate, rows, logo }: { startDate: string; rows: Entry[]; logo: Buffer }) {
  const groups = ROLE_ORDER.map((role) => ({
    role,
    list: rows.filter((e) => e.role === role && (toPay(e) !== 0 || gross(e) !== 0)),
  })).filter((g) => g.list.length > 0);
  const subtotal = (list: Entry[]) => list.reduce((a, e) => a + toPay(e), 0);
  const total = subtotal(groups.flatMap((g) => g.list));
  const anyAdvance = (list: Entry[]) => list.some((e) => e.advance !== 0);
  const generated = new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Cordoba" });

  return (
    <Document title={`Sueldos ${weekLabel(startDate)}`} author="SushiRoll">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={logo} style={s.logo} />
          <View>
            <Text style={s.title}>Liquidación de sueldos</Text>
            <Text style={s.subtitle}>
              {weekLabel(startDate)} · {startDate.slice(0, 4)}
            </Text>
          </View>
          <View style={s.totalBox}>
            <Text style={s.totalLabel}>TOTAL A PAGAR</Text>
            <Text style={s.totalValue}>{money(total)}</Text>
          </View>
        </View>

        {groups.map(({ role, list }) => (
          <View key={role} style={s.section} wrap={list.length > 18}>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>{ROLE_LABELS[role as Role]}</Text>
              <Text style={{ color: SOFT, fontSize: 9 }}>{list.length} {list.length === 1 ? "persona" : "personas"}</Text>
            </View>
            <View style={s.colHead}>
              <Text style={s.cName}>EMPLEADO</Text>
              <Text style={s.cDetail}>DETALLE</Text>
              <Text style={s.cAdv}>{anyAdvance(list) ? "ADELANTO" : ""}</Text>
              <Text style={s.cPay}>A PAGAR</Text>
            </View>
            {list.map((e) => (
              <View key={e.id} style={s.row} wrap={false}>
                <View style={s.cName}>
                  <Text>{e.name}</Text>
                  {e.note ? <Text style={s.note}>{e.note}</Text> : null}
                </View>
                <Text style={s.cDetail}>{detail(e)}</Text>
                <Text style={[s.cAdv, { color: SALMON }]}>{e.advance ? `- ${money(e.advance)}` : ""}</Text>
                <Text style={s.cPay}>{money(toPay(e))}</Text>
              </View>
            ))}
            <View style={s.subtotal}>
              <Text style={{ color: SOFT, marginRight: 10 }}>Subtotal {ROLE_LABELS[role as Role].toLowerCase()}</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", minWidth: 80, textAlign: "right" }}>{money(subtotal(list))}</Text>
            </View>
          </View>
        ))}

        <View style={s.summary} wrap={false}>
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>Resumen</Text>
          {groups.map(({ role, list }) => (
            <View key={role} style={s.sumRow}>
              <Text>{ROLE_LABELS[role as Role]}</Text>
              <Text>{money(subtotal(list))}</Text>
            </View>
          ))}
          <View style={s.sumTotal}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12 }}>TOTAL</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12 }}>{money(total)}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>SushiRoll · Generado el {generated}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const jar = await cookies();
  if (!(await verifySessionToken(jar.get(SESSION_COOKIE)?.value))) return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  const db = await getDb();
  const [week] = await db.select().from(weeks).where(eq(weeks.id, Number(id)));
  if (!week) return new Response("Semana no encontrada", { status: 404 });
  const rows = await db.select().from(entries).where(eq(entries.weekId, week.id)).orderBy(asc(entries.name));
  const logo = await readFile(path.join(process.cwd(), "public", "logo.png"));

  const pdf = await renderToBuffer(<Payroll startDate={week.startDate} rows={rows} logo={logo} />);
  const [, m, d] = week.startDate.split("-");
  const end = addDays(week.startDate, 6).split("-");
  const filename = `Sueldos - Semana ${d}-${m} al ${end[2]}-${end[1]}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
