import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyReviewedExceptions, exceptionReports } from './sast-exceptions.mjs';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const policy = JSON.parse(fs.readFileSync(path.join(repoRoot, 'config/security/sast-policy.json'), 'utf8'));
export const reviewedExceptions = JSON.parse(fs.readFileSync(path.join(repoRoot, 'config/security/false-positive-review.json'), 'utf8'));

export function evaluateSarif(report, language) {
  if (!policy.languages.includes(language)) throw new Error('Unsupported SAST language');
  if (report?.version !== '2.1.0' || !Array.isArray(report.runs) || report.runs.length !== 1) {
    throw new Error('Expected one CodeQL SARIF 2.1.0 run');
  }
  const run = report.runs[0];
  if (!run.tool?.driver?.name?.startsWith('CodeQL')
      || run.tool.driver.semanticVersion !== policy.codeqlVersion && run.tool.driver.version !== policy.codeqlVersion) {
    throw new Error('Missing or unexpected CodeQL engine version');
  }
  if (!Array.isArray(run.results)) throw new Error('Missing SAST results');
  if (!Array.isArray(run.invocations) || !run.invocations.length
      || run.invocations.some(i => i.executionSuccessful !== true
        || [...(i.toolExecutionNotifications ?? []), ...(i.toolConfigurationNotifications ?? [])]
          .some(n => n.level === 'error'))) throw new Error('Incomplete or failed CodeQL analysis');

  const components = [run.tool.driver, ...(run.tool.extensions ?? [])];
  const rules = components.flatMap(c => c.rules ?? []);
  const prefix = language === 'java' ? 'java/' : 'js/';
  const securityRules = rules.filter(r => r.id?.startsWith(prefix)
    && r.defaultConfiguration?.enabled !== false && r.properties?.tags?.includes('security'));
  if (!securityRules.length) throw new Error('No enabled security queries for the expected language');
  const findings = [];
  for (const result of run.results) {
    let rule;
    if (result.rule?.toolComponent?.index !== undefined) {
      rule = run.tool.extensions?.[result.rule.toolComponent.index]?.rules?.[result.rule.index];
    } else if (result.ruleIndex !== undefined) {
      rule = run.tool.driver.rules?.[result.ruleIndex];
    }
    const id = result.ruleId ?? result.rule?.id ?? rule?.id;
    rule ??= rules.find(r => r.id === id);
    if (!id || !rule || rule.id !== id) throw new Error('Unresolved SARIF result rule');
    const rawScore = rule.properties?.['security-severity'];
    const security = rule.properties?.tags?.includes('security');
    const score = Number(rawScore);
    if (security && (!['string', 'number'].includes(typeof rawScore) || rawScore === ''
        || !Number.isFinite(score) || score < 0 || score > 10)) {
      throw new Error(`Invalid security severity: ${id}`);
    }
    const location = result.locations?.[0]?.physicalLocation;
    findings.push({
      ruleId: id,
      score: security ? score : null,
      blocking: Boolean(security && score >= policy.minimumBlockingScore),
      file: location?.artifactLocation?.uri ?? '(unknown file)',
      line: location?.region?.startLine ?? 1,
    });
  }
  return { language, securityRules: securityRules.length, findings,
    blocking: findings.filter(f => f.blocking) };
}

// Reports are shared as CI artifacts and in GitHub Security. Do not publish
// source snippets, file contents, or source-derived diagnostic messages.
export function sanitizeSarif(report) {
  const sanitized = structuredClone(report);
  function clean(value) {
    if (!value || typeof value !== 'object') return;
    delete value.snippet;
    delete value.contents;
    delete value.environmentVariables;
    delete value.commandLine;
    delete value.arguments;
    if (value.message) value.message = { text: 'CodeQL secure coding finding; inspect the rule and source location.' };
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) child.forEach(clean);
      else clean(child);
    }
  }
  clean(sanitized);
  return sanitized;
}

export function checkReport(input, language, sanitizedOutput, publishOutput) {
  const report = JSON.parse(fs.readFileSync(input, 'utf8'));
  const evaluated = evaluateSarif(report, language);
  const sanitized = sanitizeSarif(report);
  const write = (output, value) => {
    if (!output) return;
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(value)}\n`);
  };
  // On stale/invalid exception metadata, preserve all findings without exemptions.
  let result;
  try {
    result = applyReviewedExceptions(report, evaluated, { manifest: reviewedExceptions,
      root: repoRoot, codeqlVersion: policy.codeqlVersion });
  } catch (error) {
    const reports = exceptionReports(sanitized, evaluated);
    write(sanitizedOutput, reports.audit); write(publishOutput, reports.publish);
    throw error;
  }
  const reports = exceptionReports(sanitized, result);
  write(sanitizedOutput, reports.audit); write(publishOutput, reports.publish);
  console.log(`SAST ${language}: ${result.securityRules} security queries; ${result.findings.length} findings; ${result.reviewed.length} reviewed exceptions; ${result.blocking.length} blocking; ${result.errors.length} policy errors`);
  for (const finding of result.findings) console.log(JSON.stringify(finding));
  for (const error of result.errors) console.error(error);
  return result;
}

export function gateExitCode(result) {
  return result.blocking.length ? 1 : result.errors.length ? 2 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [input, language, output, publish, ...extra] = process.argv.slice(2);
    if (!input || !language || extra.length) throw new Error('Usage: node scripts/sast-policy.mjs report.sarif java|javascript [audit.sarif] [publish.sarif]');
    process.exitCode = gateExitCode(checkReport(input, language, output, publish));
  } catch (error) {
    console.error(`SAST gate failed: ${error.message}`);
    process.exitCode = 2;
  }
}
