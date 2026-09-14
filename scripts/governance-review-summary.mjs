#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
if (report.authority !== 'governance-review-report-not-runtime-certification' || report.errors.length) {
  throw new Error('invalid governance review report');
}
// Only controlled counters/status are displayed; raw evidence is never interpolated into Markdown.
const { total, overdue, dueSoon } = report.maintenance;
if (![total, overdue, dueSoon].every((value) => Number.isSafeInteger(value) && value >= 0)) throw new Error('invalid review counts');
process.stdout.write(`Governance review: **${overdue > 0 ? 'REVIEW REQUIRED' : 'SCHEDULED'}**\n\n`
  + `Tracked schedules: ${total}; overdue: **${overdue}**; due within 30 days: ${dueSoon}.\n\n`
  + `E2E duration remeasurement: **${report.performanceEvidence?.freshness === 'overdue' ? 'REQUIRED' : 'SCHEDULED / NOT APPLICABLE'}**.\n\n`
  + 'Calendar status does not certify code or institution deployment readiness. See the JSON artifact for unresolved scope and evidence.\n');
