import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import { approvedStateItemSelectors } from './ui-url-state-census.mjs';

function realDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Shared semantic checks. Profile inheritance and exact selectors are also checked by projection integrity. */
export function validateUrlStateApproval(overlay, census, schema) {
  const errors = [];
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  if (!validate(overlay)) return validate.errors.map(error => `approval schema ${error.instancePath}: ${error.message}`);
  const hash = createHash('sha256').update(`${JSON.stringify(census, null, 2)}\n`).digest('hex');
  if (overlay.manifestRef.sha256 !== hash) errors.push('approval manifest hash does not match the active census');
  const classes = overlay.classes;
  const classIds = classes.map(row => row.classId);
  if (new Set(classIds).size !== classIds.length) errors.push('approval class ids must be unique');
  const names = classes.flatMap(row => row.selector.stateItemNames);
  if (new Set(names).size !== names.length) errors.push('approval classes overlap on state item names');
  for (const record of census.records ?? []) {
    for (const item of record.stateItems ?? []) {
      const classification = classes.find(row => row.selector.stateItemNames.includes(item.name));
      if (!classification) errors.push(`state item has no classification: ${record.id}/${item.name}`);
      if (item.name.startsWith('<') && (classification?.classId !== 'opaque'
          || classification.reviewState !== 'blocked-input' || classification.dataClass !== 'indeterminate')) {
        errors.push(`unresolved state must remain blocked opaque evidence: ${record.id}/${item.name}`);
      }
    }
  }
  for (const row of classes) {
    if (!row.owner.trim() || !realDate(row.reviewBy)) errors.push(`approval class requires owner and real reviewBy: ${row.classId}`);
    for (const approval of Object.values(row.approvals)) {
      if (approval === null) continue;
      if (!approval.reviewer.trim() || !realDate(approval.reviewedAt)
          || approval.reviewedAt > row.reviewBy || approval.evidence.some(value => !value.trim())) {
        errors.push(`approval evidence requires reviewer, real ordered dates and non-empty evidence: ${row.classId}`);
      }
    }
  }
  if (approvedStateItemSelectors(overlay, census).length !== classes.filter(row => row.reviewState === 'approved').length) {
    errors.push('approved classes do not satisfy the production approval matcher');
  }
  return errors;
}
