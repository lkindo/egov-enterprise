package nuri.migration.validate.ledger;

import nuri.migration.model.MappingSpec;
import nuri.migration.validate.ledger.TermLedger.ColumnRef;
import nuri.migration.validate.ledger.TermLedger.Conformance;
import nuri.migration.validate.ledger.TermLedger.Entry;
import nuri.migration.validate.ledger.TermLedger.StandardTerm;
import nuri.migration.validate.ledger.TermLedger.Transition;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 용어 매핑 원장을 세 단계로 검사한다(ADR-0029 결정 2·3). 오류 문구는 행 ID·표·컬럼 이름·상태만 담는다.
 *
 * <ol>
 *   <li>{@link #validate} — 형식·상태별 필수 항목·전이 이력. 확정·제외·보관은 사람이 했다는 기록이 있어야 한다.</li>
 *   <li>{@link #coverage} — mapping 이 소스 컬럼에서 옮기는 모든 컬럼이 같은 대상의 확정 행을 가리키는지.</li>
 *   <li>{@link #live} — 확정 행의 표준 용어가 live 메타에 있고 이름·도메인이 같으며 폐기되지 않았는지.</li>
 * </ol>
 */
public final class TermLedgerValidator {

    static final Set<String> GRADES = Set.of("EXACT", "SYNONYM", "INFERRED", "UNKNOWN");
    static final Map<String, Set<String>> TRANSITIONS = Map.of(
            "PROPOSED", Set.of("REVIEWED", "REJECTED"),
            "REVIEWED", Set.of("CONFIRMED", "APPROVED_IGNORE", "ARCHIVE", "REGISTRATION_REQUESTED", "REJECTED",
                    "PROPOSED"),
            "REGISTRATION_REQUESTED", Set.of("REVIEWED", "REJECTED"),
            "CONFIRMED", Set.of("REVIEWED"),
            "APPROVED_IGNORE", Set.of("REVIEWED"),
            "ARCHIVE", Set.of("REVIEWED"),
            "REJECTED", Set.of("PROPOSED"));
    /** 사람의 결정이어야 하는 상태. 도구 이름으로 기록하면 거부한다. */
    static final Set<String> HUMAN_DECISIONS = Set.of("CONFIRMED", "APPROVED_IGNORE", "ARCHIVE");
    static final Set<String> TOOL_ACTORS = Set.of("term-suggest", "migration-tool", "conformance", "llm", "tool");
    private static final Pattern ID = Pattern.compile("[A-Za-z0-9_.-]{1,64}");

    public List<String> validate(TermLedger ledger) {
        Objects.requireNonNull(ledger, "ledger");
        List<String> errors = new ArrayList<>();
        if (!Objects.equals(ledger.schemaVersion(), TermLedger.CURRENT_SCHEMA_VERSION)) {
            errors.add("원장 schemaVersion 은 " + TermLedger.CURRENT_SCHEMA_VERSION + " 이어야 합니다");
        }
        Set<String> ids = new HashSet<>();
        Set<String> sources = new HashSet<>();
        for (Entry entry : ledger.entries()) {
            String id = entry.id();
            if (id == null || !ID.matcher(id).matches()) {
                errors.add("원장 행 ID 형식이 맞지 않습니다");
                continue;
            }
            if (!ids.add(id)) {
                errors.add(id + ": 같은 ID 가 두 번 있습니다");
            }
            if (!complete(entry.source())) {
                errors.add(id + ": source 표·컬럼이 필요합니다");
            } else if (!sources.add(key(entry.source()))) {
                errors.add(id + ": 같은 소스 컬럼(" + entry.source().table() + "." + entry.source().column()
                        + ")이 두 행에 있습니다");
            }
            if (entry.grade() == null || !GRADES.contains(entry.grade())) {
                errors.add(id + ": grade 는 EXACT·SYNONYM·INFERRED·UNKNOWN 중 하나여야 합니다");
            }
            if (entry.status() == null || !TRANSITIONS.containsKey(entry.status())) {
                errors.add(id + ": 알 수 없는 상태입니다");
                continue;
            }
            history(entry, errors);
            stateRequirements(entry, errors);
        }
        return errors;
    }

    private static void history(Entry entry, List<String> errors) {
        String current = "PROPOSED";
        LocalDate previous = null;
        for (Transition transition : entry.history()) {
            String to = transition.to();
            if (to == null || !TRANSITIONS.get(current).contains(to)) {
                errors.add(entry.id() + ": " + current + " 에서 " + to + " 로 갈 수 없습니다");
                return;
            }
            if (blank(transition.by())) {
                errors.add(entry.id() + ": " + to + " 전이에 처리자(by)가 필요합니다");
            } else if (HUMAN_DECISIONS.contains(to)
                    && TOOL_ACTORS.contains(transition.by().strip().toLowerCase(Locale.ROOT))) {
                errors.add(entry.id() + ": " + to + " 는 사람이 정해야 합니다(도구가 기록할 수 없습니다)");
            }
            LocalDate at = date(transition.at());
            if (at == null) {
                errors.add(entry.id() + ": " + to + " 전이 날짜(at)는 yyyy-MM-dd 여야 합니다");
            } else if (previous != null && at.isBefore(previous)) {
                errors.add(entry.id() + ": 전이 날짜가 앞 전이보다 이릅니다");
            }
            previous = at == null ? previous : at;
            current = to;
        }
        if (!current.equals(entry.status())) {
            errors.add(entry.id() + ": 전이 이력의 마지막 상태(" + current + ")가 status(" + entry.status()
                    + ")와 다릅니다");
        }
    }

    private static void stateRequirements(Entry entry, List<String> errors) {
        String id = entry.id();
        switch (entry.status()) {
            case "CONFIRMED" -> {
                if (!complete(entry.term())) {
                    errors.add(id + ": 확정에는 표준 용어(이름·영문약어·도메인)가 필요합니다");
                }
                if (!complete(entry.target())) {
                    errors.add(id + ": 확정에는 대상 표·컬럼이 필요합니다");
                } else if (complete(entry.term())
                        && !entry.target().column().equalsIgnoreCase(entry.term().engAbbr())) {
                    errors.add(id + ": 대상 컬럼(" + entry.target().column() + ")이 표준 영문약어("
                            + entry.term().engAbbr() + ")와 다릅니다");
                }
                if ("UNKNOWN".equals(entry.grade())) {
                    errors.add(id + ": 근거가 없는(UNKNOWN) 행은 확정할 수 없습니다");
                }
                conformance(entry, errors);
            }
            case "APPROVED_IGNORE" -> {
                if (blank(entry.note())) {
                    errors.add(id + ": 이관 제외에는 사유(note)가 필요합니다");
                }
            }
            case "ARCHIVE" -> {
                if (entry.archive() == null || date(entry.archive().retainUntil()) == null) {
                    errors.add(id + ": 외부 보관에는 보존 기한(archive.retainUntil, yyyy-MM-dd)이 필요합니다");
                }
            }
            case "REGISTRATION_REQUESTED" -> {
                if (entry.term() == null || blank(entry.term().name())) {
                    errors.add(id + ": 표준 등록 요청에는 요청할 용어 이름이 필요합니다");
                }
            }
            default -> {
                // PROPOSED·REVIEWED·REJECTED 는 추가 필수 항목이 없다.
            }
        }
    }

    private static void conformance(Entry entry, List<String> errors) {
        Conformance conformance = entry.conformance();
        if (conformance == null || conformance.rate() == null
                || conformance.rate().compareTo(BigDecimal.ZERO) < 0
                || conformance.rate().compareTo(BigDecimal.valueOf(100)) > 0) {
            errors.add(entry.id() + ": 확정에는 0~100 의 적합률(conformance.rate)이 필요합니다");
            return;
        }
        if (conformance.rate().compareTo(BigDecimal.valueOf(100)) < 0) {
            var exceptions = conformance.approvedExceptions();
            if (exceptions == null || exceptions.maxRows() == null || exceptions.maxRows() <= 0
                    || blank(exceptions.reason())) {
                errors.add(entry.id() + ": 적합률이 100 이 아니면 승인된 예외(행 수 상한·사유)가 필요합니다");
            }
        }
    }

    /**
     * mapping 이 소스 컬럼에서 옮기는 컬럼(상수 아님)마다 같은 소스·대상의 확정 행이 있어야 한다. 표·컬럼 이름은
     * 대소문자를 가리지 않는다.
     */
    public List<String> coverage(TermLedger ledger, MappingSpec mapping) {
        Map<String, Entry> bySource = new HashMap<>();
        for (Entry entry : ledger.entries()) {
            if (complete(entry.source())) {
                bySource.putIfAbsent(key(entry.source()), entry);
            }
        }
        List<String> errors = new ArrayList<>();
        for (MappingSpec.TableMapping table : mapping.tables()) {
            for (MappingSpec.ColumnMapping column : table.columns()) {
                if (column.source() == null || column.constant() != null) {
                    continue;
                }
                String where = table.source() + "." + column.source();
                Entry entry = bySource.get(key(new ColumnRef(table.source(), column.source())));
                if (entry == null) {
                    errors.add(where + ": 원장에 없는 매핑입니다");
                } else if (!"CONFIRMED".equals(entry.status())) {
                    errors.add(where + ": 원장 행 " + entry.id() + " 이 확정되지 않았습니다(" + entry.status() + ")");
                } else if (!complete(entry.target())
                        || !entry.target().table().equalsIgnoreCase(table.target())
                        || !entry.target().column().equalsIgnoreCase(column.target())) {
                    errors.add(where + ": 원장 행 " + entry.id() + " 의 대상과 mapping 의 대상("
                            + table.target() + "." + column.target() + ")이 다릅니다");
                }
            }
        }
        return errors;
    }

    /** 확정 행의 표준 용어를 live 메타와 대조한다. {@code terms} 의 키는 대문자 영문약어다. */
    public List<String> live(TermLedger ledger, Map<String, StandardTermRecord> terms) {
        List<String> errors = new ArrayList<>();
        for (Entry entry : ledger.entries()) {
            if (!"CONFIRMED".equals(entry.status()) || !complete(entry.term())) {
                continue;
            }
            StandardTerm term = entry.term();
            StandardTermRecord record = terms.get(term.engAbbr().toUpperCase(Locale.ROOT));
            if (record == null) {
                errors.add(entry.id() + ": 표준 용어 " + term.engAbbr() + " 가 live 메타에 없습니다");
                continue;
            }
            if (!term.name().equals(record.name())) {
                errors.add(entry.id() + ": 표준 용어 이름이 live 메타(" + record.name() + ")와 다릅니다");
            }
            if (!term.domain().equals(record.domain())) {
                errors.add(entry.id() + ": 표준 도메인이 live 메타(" + record.domain() + ")와 다릅니다");
            }
            if (record.deprecated()) {
                errors.add(entry.id() + ": 표준 용어 " + term.engAbbr() + " 는 폐기됐습니다");
            }
        }
        return errors;
    }

    /** live 대조가 읽어야 할 영문약어를 대상 표의 schema 별로 모은다(기본 public). */
    public Map<String, Set<String>> confirmedTermsBySchema(TermLedger ledger) {
        Map<String, Set<String>> bySchema = new HashMap<>();
        for (Entry entry : ledger.entries()) {
            if ("CONFIRMED".equals(entry.status()) && complete(entry.term()) && complete(entry.target())) {
                String table = entry.target().table();
                int dot = table.indexOf('.');
                String schema = dot > 0 ? table.substring(0, dot) : "public";
                bySchema.computeIfAbsent(schema, key -> new HashSet<>())
                        .add(entry.term().engAbbr().toUpperCase(Locale.ROOT));
            }
        }
        return bySchema;
    }

    private static String key(ColumnRef ref) {
        return ref.table().toLowerCase(Locale.ROOT) + '\u0000' + ref.column().toLowerCase(Locale.ROOT);
    }

    private static boolean complete(ColumnRef ref) {
        return ref != null && !blank(ref.table()) && !blank(ref.column());
    }

    private static boolean complete(StandardTerm term) {
        return term != null && !blank(term.name()) && !blank(term.engAbbr()) && !blank(term.domain());
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static LocalDate date(String value) {
        if (value == null || !value.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException failure) {
            return null;
        }
    }

    /** live 메타의 표준 용어 한 행. */
    public record StandardTermRecord(String name, String domain, boolean deprecated) {}
}
