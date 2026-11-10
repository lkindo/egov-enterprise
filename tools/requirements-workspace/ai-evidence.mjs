import { validatePrivateAiValue } from './ai-contract.mjs';

export const EVIDENCE_PROTOCOL = 'stored-evidence-v3';
const MAX_REFERENCES = 32768;
const invalid = () => { throw Object.assign(new Error('AI_OUTPUT_INVALID'), { code: 'AI_OUTPUT_INVALID', details: [{ kind: 'citation-reference', path: 'citations' }] }); };
const keyOf = value => JSON.stringify([value.sourceId, value.clauseId, value.quote]);
const clauseKey = (sourceId, clauseId) => JSON.stringify([sourceId, clauseId]);
const letters = text => (text.match(/[\p{L}\p{N}]/gu) ?? []).length;
const protocolInstructions = 'Evidence protocol stored-evidence-v3: In the RESPONSE every citations array contains integer evidenceCatalog indexes, not quote objects. Canonical examples below describe final storage, not the wire response. evidenceCatalog rows are [sourceId, clauseId, quoteOrSpan, allowed, evidenceIndex]. quoteOrSpan is either a FULL verbatim quote string or [start,end] UTF-16 offsets into the FULL text of that exact source/clause under data.sources or data.policySources. The end offset is exclusive. A span references text supplied in full, never an omitted document. Select the explicit LAST integer, never count rows or invent indexes. All historical quotations without a supplied full current clause remain inline in FULL: compare their exact conditions, thresholds and exceptions with current sources, even if earlier generated descriptions omitted them. Current sources are verbatim. Choose allowed evidence supporting every fact and unresolved question. Never invent a quote, index or approval. Unchanged prior requirements/issues are retained automatically; return only the requested delta/revisions and new issues. The application restores exact selected quotations; do not reprint their bodies in the RESPONSE. Global business context alone does not authorize an entry with allowed=false.';

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
  // Verified quotations can contain newlines themselves. Keep their original
  // boundaries rather than joining gaps or splitting a valid multiline quote.
  if (clause.citationEvidence && Array.isArray(clause.citationExcerpts)) return [...new Set(clause.citationExcerpts.filter(quote => typeof quote === 'string' && quote.length > 0 && quote.length <= 2000 && clause.text.includes(quote)))];
  // The complete text stays in sources. Prefer whole sentences/lines; only a
  // long segment needs windows, with a tail window for a short final fragment.
  const required = Math.min(12, letters(clause.text)), result = new Set();
  const parts = clause.citationEvidence ? clause.text.split('\n') : [clause.text];
  const segmenter = new Intl.Segmenter('ko', { granularity: 'sentence' });
  const add = quote => { quote = quote.trim(); if (required && letters(quote) >= required && quote.length <= 2000) result.add(quote); };
  for (const part of parts) {
    const before = result.size; let pending = '';
    const flush = () => {
      const chars = Array.from(pending);
      if (chars.length <= 240) add(pending);
      else for (let start = 0; start < chars.length; start += 240) {
        const end = Math.min(start + 240, chars.length), quote = chars.slice(start, end).join('');
        add(letters(quote) >= required ? quote : chars.slice(Math.max(0, end - 240), end).join(''));
      }
      pending = '';
    };
    for (const { segment } of segmenter.segment(part)) {
      if (pending && Array.from(pending + segment).length > 240 && letters(pending) >= required) flush();
      pending += segment;
      if (Array.from(pending).length > 240 && letters(pending) >= required) flush();
    }
    flush();
    if (required && part.length <= 2000 && letters(part) >= required && result.size === before) add(part);
  }
  return [...result];
}

function withoutQuoteBoundaries(data) {
  const result = { ...data };
  for (const field of ['sources', 'policySources']) if (result[field]) result[field] = result[field].map(source => ({ ...source, clauses: source.clauses.map(({ citationExcerpts: _boundaries, ...clause }) => clause) }));
  return result;
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
      indexes.set(key, evidence.length); evidence.push(structuredClone(citation));
      const clause = current.get(clauseKey(citation.sourceId, citation.clauseId));
      const start = clause?.text.indexOf(citation.quote) ?? -1;
      catalog.push([citation.sourceId, citation.clauseId, start >= 0 ? [start, start + citation.quote.length] : citation.quote, allowed.has(clauseKey(citation.sourceId, citation.clauseId)), evidence.length - 1]);
    }
    return indexes.get(key);
  };
  const project = value => {
    if (Array.isArray(value)) return value.map(project);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === 'citations' && Array.isArray(item) ? item.map(indexFor) : project(item)]));
  };
  // Keep invariant context before the changing draft/source partition. This
  // preserves exact facts and permits the provider to reuse a common prefix;
  // cache hits and time savings are measured, never assumed.
  const stableFields = ['project', 'modules', 'businessModel', 'decisions', 'sourceReadingNotes', 'policySources', 'previousRequirements'];
  const fields = [...stableFields.filter(key => Object.hasOwn(original.data, key)), ...Object.keys(original.data).filter(key => !stableFields.includes(key) && key !== 'analysisBatch'), ...(Object.hasOwn(original.data, 'analysisBatch') ? ['analysisBatch'] : [])];
  const projected = withoutQuoteBoundaries(project(Object.fromEntries(fields.map(key => [key, original.data[key]]))));
  for (const [key, clause] of current) {
    const [sourceId, clauseId] = JSON.parse(key);
    for (const quote of excerpts(clause)) indexFor({ sourceId, clauseId, quote });
  }
  const wire = { ...original, instructions: `${protocolInstructions}\n\n${original.instructions}\n\nResponse reminder: citations are integer evidenceCatalog indexes; return no quote bodies.`, data: { ...projected, evidenceProtocol: EVIDENCE_PROTOCOL, evidenceCatalog: catalog } };
  const canonicalRequest = { ...original, data: withoutQuoteBoundaries(original.data) };
  if (Buffer.byteLength(JSON.stringify(wire)) > 768 * 1024 && Buffer.byteLength(JSON.stringify(canonicalRequest)) <= 768 * 1024) {
    // Selector overhead must neither hide evidence nor reject an input that the
    // original complete contract accepts. Fall back to that exact contract.
    return { request: canonicalRequest, schema: structuredClone(schema), resolve(value) { validatePrivateAiValue(value, schema); return structuredClone(value); } };
  }
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
