import { readFile } from "node:fs/promises";
import { basename } from "node:path";

export interface BugFormFields {
  title: string;
  project_id: string;
  severity?: string;
  description?: string;
  steps?: string;
  expected?: string;
  actual?: string;
  files?: string[];
}

/**
 * Build a FormData payload for POST /bugs.
 * Shared between `qara bugs create` and `qara capture` to avoid drift.
 */
export async function buildBugFormData(
  fields: BugFormFields
): Promise<FormData> {
  const form = new FormData();
  form.append("title", fields.title);
  form.append("project_id", fields.project_id);
  if (fields.severity) form.append("severity", fields.severity);
  if (fields.description) form.append("description", fields.description);
  if (fields.steps) form.append("steps_to_reproduce", fields.steps);
  if (fields.expected) form.append("expected_behavior", fields.expected);
  if (fields.actual) form.append("actual_behavior", fields.actual);

  if (fields.files) {
    for (const filePath of fields.files) {
      const fileData = await readFile(filePath);
      const blob = new Blob([fileData]);
      form.append("files", blob, basename(filePath));
    }
  }

  return form;
}
