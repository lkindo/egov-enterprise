package nuri.migration.validate;

import nuri.migration.domain.DomainCategory;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.validate.CodeSetPrecheck.ColumnKey;
import nuri.migration.validate.CodeSetPrecheck.PrecheckResult;
import nuri.migration.validate.ProductCodeBindings.Binding;
import nuri.migration.validate.ledger.LoadCapabilities;
import nuri.migration.validate.ledger.TermLedger;
import nuri.migration.validate.ledger.TermLedger.Entry;
import nuri.migration.validate.ledger.TermLedger.StandardTerm;
import nuri.migration.validate.ledger.TermLedgerValidator;
import nuri.migration.validate.ledger.TermLedgerValidator.StandardTermRecord;
import nuri.migration.validate.ledger.TermLedgerValidator.TermKey;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * [ADR-0029 L4 D7] mapping 이 쓰는 대상 컬럼 가운데 공통코드·허용값 대사 대상을 정한다. 결과는 대사 계획에 실려 적재 뒤
 * 대사가 대상 컬럼 전체를 센다.
 *
 * <ol>
 *   <li>제품 바인딩({@link ProductCodeBindings})이 있는 컬럼은 {@code COMMON_CODE} — VALIDATE 와 DISPLAY 모두.</li>
 *   <li>원장 확정 행의 표준 용어가 코드 범주이고 live 메타 허용값을 읽을 수 있으면 {@code ALLOWED_VALUES}.</li>
 *   <li>1·2 에 load 를 실패시킬 원천(VALIDATE 바인딩·메타 허용값)이 없는 코드 컬럼은 {@code UNRECONCILED} — 표준 용어가 코드
 *       범주인 확정 행(허용값을 읽을 수 없다)과, 비표준 대상(U1) 확정 행 가운데 codemap 을 쓰거나 대상 컬럼 이름이
 *       {@code _cd} 로 끝나는 행이다. DISPLAY 바인딩은 실패 원천이 아니므로 그 컬럼도 서명 대상이 된다
 *       (사용자 결정 L4-P2, DEC-OPS-325).</li>
 * </ol>
 *
 * <p>여부 범주는 다루지 않는다 — D2 의 형식 도메인 대사가 판정한다. 같은 대상 컬럼을 여러 매핑이 쓰면 대상 하나로 센다.</p>
 */
public final class CodeSetTargets {

    private static final String CONFIRMED = "CONFIRMED";

    private CodeSetTargets() {
    }

    /**
     * @param ledger        원장. 없으면 바인딩만 본다
     * @param terms         live 메타 표준 용어 — 키는 원장 검증과 같은 (대상 schema, 대문자 영문약어)다
     * @param defaultSchema schema 를 밝히지 않은 대상 표의 schema(대상 연결의 현재 schema)
     * @param precheck      쓰기 전 게이트 결과 — 미룬 schema 와 헤더 없는 DISPLAY 컬럼을 옮긴다
     */
    public static List<CodeSetTarget> of(MappingSpec spec, TermLedger ledger, Map<TermKey, StandardTermRecord> terms,
                                         String defaultSchema, List<Binding> bindings, PrecheckResult precheck) {
        Objects.requireNonNull(spec, "spec");
        Objects.requireNonNull(bindings, "bindings");
        Map<TermKey, StandardTermRecord> liveTerms = terms == null ? Map.of() : terms;
        PrecheckResult gate = precheck == null ? PrecheckResult.empty() : precheck;
        Map<ColumnKey, Written> written = written(spec, defaultSchema);
        Map<ColumnKey, List<Entry>> confirmed = confirmed(ledger, defaultSchema);
        List<CodeSetTarget> targets = new ArrayList<>();
        for (Map.Entry<ColumnKey, Written> column : written.entrySet()) {
            ColumnKey key = column.getKey();
            Written target = column.getValue();
            boolean failSource = false;
            for (Binding binding : ProductCodeBindings.of(bindings, target.mappingTarget(), key.column())) {
                CodeSetTarget row = CodeSetTarget.commonCode(key.table(), key.column(), binding,
                        gate.deferred(target.schema()), gate.groupAbsent(key.table(), key.column()));
                targets.add(row);
                failSource |= row.failSource();
            }
            List<Entry> entries = confirmed.getOrDefault(key, List.of());
            for (Entry entry : entries) {
                if (!codeTerm(entry)) {
                    continue;
                }
                StandardTermRecord record = liveTerms.get(new TermKey(termSchema(entry.target().table(), defaultSchema),
                        entry.term().engAbbr()));
                Set<String> allowed = record == null ? Set.of() : LoadCapabilities.allowedCodes(record.allowedValues());
                if (!allowed.isEmpty()) {
                    targets.add(CodeSetTarget.allowedValues(key.table(), key.column(), allowed, entry.id()));
                    failSource = true;
                    break;
                }
            }
            if (failSource) {
                continue;
            }
            for (Entry entry : entries) {
                if (codeTerm(entry) || nonStandardCode(entry)) {
                    targets.add(CodeSetTarget.unreconciled(key.table(), key.column(), entry.id()));
                    break;
                }
            }
        }
        return targets;
    }

    /** 표준 용어가 완전하고 그 도메인이 코드 범주인 확정 행. */
    static boolean codeTerm(Entry entry) {
        StandardTerm term = entry.term();
        return term != null && !blank(term.name()) && !blank(term.engAbbr()) && !blank(term.domain())
                && DomainCategory.of(term.domain(), null) == DomainCategory.CODE;
    }

    /** 비표준 대상(U1) 확정 행 가운데 codemap 을 쓰거나 대상 컬럼 이름이 {@code _cd} 로 끝나는 행. */
    static boolean nonStandardCode(Entry entry) {
        return entry.nonStandardTarget() != null && entry.term() == null
                && ((entry.load() != null && entry.load().codemap() != null)
                || entry.target().column().trim().toLowerCase(Locale.ROOT).endsWith("_cd"));
    }

    /** mapping 이 쓰는 대상 컬럼(매핑·컬럼 순서, 중복 없음). */
    private static Map<ColumnKey, Written> written(MappingSpec spec, String defaultSchema) {
        Map<ColumnKey, Written> written = new LinkedHashMap<>();
        for (TableMapping table : spec.tables()) {
            if (table == null || blank(table.target())) {
                continue;
            }
            String schema = ProductCodeBindings.schemaName(table.target(), defaultSchema);
            String qualified = schema + "." + ProductCodeBindings.tableName(table.target());
            for (ColumnMapping column : table.columns()) {
                if (column != null && !blank(column.target())) {
                    written.putIfAbsent(new ColumnKey(qualified, column.target().trim()),
                            new Written(schema, table.target()));
                }
            }
        }
        return written;
    }

    /** 원장 확정 행을 대상 컬럼으로 묶는다(원장 순서). */
    private static Map<ColumnKey, List<Entry>> confirmed(TermLedger ledger, String defaultSchema) {
        Map<ColumnKey, List<Entry>> confirmed = new LinkedHashMap<>();
        if (ledger == null) {
            return confirmed;
        }
        for (Entry entry : ledger.entries()) {
            if (entry == null || !CONFIRMED.equals(entry.status()) || blank(entry.id()) || entry.target() == null
                    || blank(entry.target().table()) || blank(entry.target().column())) {
                continue;
            }
            String table = ProductCodeBindings.schemaName(entry.target().table(), defaultSchema) + "."
                    + ProductCodeBindings.tableName(entry.target().table());
            confirmed.computeIfAbsent(new ColumnKey(table, entry.target().column().trim()),
                    ignored -> new ArrayList<>()).add(entry);
        }
        return confirmed;
    }

    /** 원장 검증이 live 용어를 읽을 때 쓰는 schema — 대상 표의 schema 부분(쓴 그대로) 또는 기본 schema. */
    private static String termSchema(String table, String defaultSchema) {
        int dot = table.indexOf('.');
        return dot > 0 ? table.substring(0, dot)
                : blank(defaultSchema) ? TermLedgerValidator.DEFAULT_SCHEMA : defaultSchema;
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    /** mapping 이 쓰는 대상 컬럼의 schema(소문자)와 mapping 의 대상 표기. */
    private record Written(String schema, String mappingTarget) {}
}
