import { asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { employees } from "@/lib/schema";
import { EmployeeManager } from "@/components/employee-manager";

export const dynamic = "force-dynamic";

export default async function EmpleadosPage() {
  const db = await getDb();
  const list = await db.select().from(employees).orderBy(asc(employees.name));
  return <EmployeeManager employees={list} />;
}
