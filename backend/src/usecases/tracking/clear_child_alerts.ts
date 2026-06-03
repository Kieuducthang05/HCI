import { eq } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { alerts } from "../../db/schema.ts";
import { requireOwnedActiveParentChild, normalizeUseCaseUuid } from "../parent_child_access.ts";

export type ClearChildAlertsInput = {
  parentId: string;
  childId: string;
};

export async function clearChildAlerts(input: ClearChildAlertsInput): Promise<void> {
  const parentId = normalizeUseCaseUuid(
    input.parentId,
    "MISSING_PARENT_ID",
    "INVALID_PARENT_ID",
    "Parent ID",
  );
  const childId = normalizeUseCaseUuid(
    input.childId,
    "MISSING_CHILD_ID",
    "INVALID_CHILD_ID",
    "Child ID",
  );

  await requireOwnedActiveParentChild({ parentId, childId });

  await db.delete(alerts).where(eq(alerts.childId, childId));
}
