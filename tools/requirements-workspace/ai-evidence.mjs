import { validatePrivateAiValue } from './ai-contract.mjs';

export const EVIDENCE_PROTOCOL = 'stored-evidence-v1';
const MAX_REFERENCES = 10000;
const invalid = () => { throw Object.assign(new Error('AI_OUTPUT_INVALID'), { code: 'AI_OUTPUT_INVALID', details: [{ kind: 'citation-reference', path: 'citations' }] }); };
const keyOf = value => JSON.stringify([value.sourceId, value.clauseId, value.quote]);
const clauseKey = (sourceId, clauseId) => JSON.stringify([sourceId, clauseId]);
const letters = text => (text.match(/[\p{L}\p{N}]/gu) ?? []).length;
const protocolInstructions = 'Evidence protocol stored-evidence-v1: In the RESPONSE every citations array contains integer evidenceCatalog indexes, not quote objects. Canonical examples below describe final storage, not the wire response. evidenceCatalog entries are [sourceId, clauseId, quoteOrNull, allowed]. null means exact prior evidence already preserved by the application, never missing/unreadable text. Existing requirement/issue meaning, conditions, thresholds, exceptions and open decisions remain fully supplied. Current sources are verbatim. Choose an allowed current excerpt supporting each new fact; stored references may support known prior facts. Never invent a quote, index or approval. Unchanged prior requirements/issues are retained automatically; return only the requested delta/revisions and new issues. Existing citations are preserved by the application, so do not reprint their bodies. Global business context alone does not authorize an entry with allowed=false.';

function referenceSchema(schema) {
  const result = structuredClone(schema);
  function visit(node) {
    if (node.properties?.citations?.type === 'array') node.properties.citations.items = { type: 'integer', minimum: 0, maximum: MAX_REFERENCES - 1 };
    for (const value of Object.values(node.properties ?? {})) visit(value);
    if (node.items) visit(node.items);
    for (const branch of node.anyOf ?? []) visit(branch);
  }
  visit(result);
  return result;
}

function excerpts(clause) {
  // The complete supplied text stays in sources. Overlapping exact excerpts
  // are selectors, not a summary or an omission of the underlying paragraph.
  const required = Math.min(12, letters(clause.text)), result = new Set();
  const parts = clause.citationEvidence ? clause.text.split('\n') : [clause.text];
  for (const part of parts) {
    const chars = Array.from(part);
    for (let start = 0; start < chars.length; start += 120) {
      const quote = chars.slice(start, start + 240).join('');
      if (required && letters(quote) >= required && quote.length <= 2000) result.add(quote);
    }
    if (required && part.length <= 2000 && letters(part) >= required && !result.size) result.add(part);
  }
  return [...result];
}

export function prepareEvidenceRequest(request, schema) {
  const original = structuredClone(request), nativeSchema = referenceSchema(schema);
  if (!original.data || original.data.evidenceProtocol || original.data.evidenceCatalog) invalid();
  const current = new Map([...(original.data.sources ?? []), ...(original.data.policySources ?? [])].flatMap(source => source.clauses.map(clause => [clauseKey(source.id, clause.id), clause])));
  const allowed = new Set(current.keys());
  for (const item of [...(original.data.previousAnalysis?.requirements ?? []), ...(original.data.previousAnalysis?.issues ?? []), ...(original.data.requirements ?? []), ...(original.data.existingIssues ?? [])]) {
    for (const citation of item.citations ?? []) allowed.add(clauseKey(citation.sourceId, citation.clauseId));
  }
  const evidence = [], catalog = [], indexes = new Map();
  const indexFor = citation => {
    const key = keyOf(citation);
    if (!indexes.has(key)) {
      if (evidence.length >= MAX_REFERENCES) throw Object.assign(new Error('AI_EVIDENCE_CAPACITY'), { code: 'AI_EVIDENCE_CAPACITY' });
      const clause = current.get(clauseKey(citation.sourceId, citation.clauseId));
      indexes.set(key, evidence.length); evidence.push(structuredClone(citation));
      catalog.push([citation.sourceId, citation.clauseId, clause?.text.includes(citation.quote) ? citation.quote : null, allowed.has(clauseKey(citation.sourceId, citation.clauseId))]);
    }
    return indexes.get(key);
  };
  const project = value => {
    if (Array.isArray(value)) return value.map(project);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === 'citations' && Array.isArray(item) ? item.map(indexFor) : project(item)]));
  };
  const projected = project(original.data);
  for (const [key, clause] of current) {
    const [sourceId, clauseId] = JSON.parse(key);
    for (const quote of excerpts(clause)) indexFor({ sourceId, clauseId, quote });
  }
  const wire = { ...original, instructions: `${protocolInstructions}\n\n${original.instructions}\n\nResponse reminder: citations are integer evidenceCatalog indexes; return no quote bodies.`, data: { ...projected, evidenceProtocol: EVIDENCE_PROTOCOL, evidenceCatalog: catalog } };
  return {
    request: wire,
    schema: nativeSchema,
    resolve(value) {
      // Existing embedded runners may still return the canonical schema. Its
      // complete original semantic validators remain authoritative downstream.
      try { validatePrivateAiValue(value, schema); return structuredClone(value); }
      catch (error) { if (error.code !== 'AI_OUTPUT_INVALID') throw error; }
      validatePrivateAiValue(value, nativeSchema);
      const restore = item => {
        if (Array.isArray(item)) return item.map(restore);
        if (!item || typeof item !== 'object') return item;
        return Object.fromEntries(Object.entries(item).map(([key, nested]) => [key, key === 'citations' && Array.isArray(nested) ? nested.map(index => {
          if (!Number.isSafeInteger(index) || !evidence[index] || !catalog[index][3]) invalid();
          return structuredClone(evidence[index]);
        }) : restore(nested)]));
      };
      return restore(value);
    },
  };
}
