package nuri.migration.validate.ledger;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.InventoryTables;
import nuri.migration.domain.DomainCategory;
import nuri.migration.domain.DomainViolation;
import nuri.migration.lookup.LookupRef;
import nuri.migration.mapping.MappingIndex;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.NullPolicy;
import nuri.migration.model.MappingSpec.UnmappedPolicy;
import nuri.migration.transform.TypeConverter;
import nuri.migration.validate.ledger.TermLedger.ApprovedExceptions;
import nuri.migration.validate.ledger.TermLedger.ColumnRef;
import nuri.migration.validate.ledger.TermLedger.Conformance;
import nuri.migration.validate.ledger.TermLedger.Entry;
import nuri.migration.validate.ledger.TermLedger.Load;
import nuri.migration.validate.ledger.TermLedger.StandardTerm;
import nuri.migration.validate.ledger.TermLedger.Transition;
import nuri.migration.validate.ledger.TermLedger.ViolationCount;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Predicate;
import java.util.regex.Pattern;

/**
 * 용어 매핑 원장을 네 단계로 검사한다(ADR-0029 결정 2·3, L3a-2). 오류 문구는 행 ID·표·컬럼 이름·상태와 고정 어휘만
 * 담는다 — 원장의 자유 서술(사유·변환기 이름 등)은 되풀이하지 않는다.
 *
 * <ol>
 *   <li>{@link #validate} — 형식·상태별 필수 항목·전이 이력·유일 키, 확정 행의 load·위반 처리·도메인 가드. 확정·제외·
 *       보관은 사람이 했다는 기록이 있어야 한다.</li>
 *   <li>{@link #coverage} — mapping 과 원장을 승인 inventory 의 표·컬럼으로 맞춘다. mapping 의 모든 컬럼이 같은
 *       대상의 확정 행을 가리키고 load 가 같은지, 확정 행이 모두 mapping 에 있는지, 소스 표의 모든 컬럼이 정해졌는지.</li>
 *   <li>{@link #codemaps} — 확정 행이 쓰는 codemap 이 mapping 에 있고, 위반 처리에 쓰면 {@code unmapped: fail} 이며,
 *       허용값을 읽을 수 있으면 표준 코드가 그 안에 있는지.</li>
 *   <li>{@link #live} — 확정 행의 표준 용어가 live 메타에 있고 이름·도메인이 같으며 폐기되지 않았는지, 비표준 대상은
 *       정말 용어가 없는지.</li>
 * </ol>
 *
 * <p>확정 규칙(형식 2): 적합률은 참고값이다. 확정하려면 적합률 또는 셀 수 없었던 이유({@code unmeasured})와 사유가
 * 있어야 하고, 기록된 위반마다 실행 시점 처리(nullify·승인 예외·codemap)가, 셀 수 없었던 위반마다 행 단위 판정이
 * 있어야 한다({@link LoadCapabilities}). 허용값을 확인하지 못한 코드 컬럼은 사유와 함께 codemap 없이 확정할 수 있다 —
 * 허용값 대사는 L4 가 맡는다(DEC-OPS-317 U3).</p>
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
    /** 매핑과 무관하게 소스 컬럼 하나를 처분하는 상태 — mapping·via·비표준 대상을 둘 수 없다. */
    static final Set<String> SOURCE_DISPOSITIONS = Set.of("APPROVED_IGNORE", "ARCHIVE");
    private static final Pattern ID = Pattern.compile("[A-Za-z0-9_.-]{1,64}");
    /** 매핑 id 와 조회 별칭의 형식(ADR-0029 L3c·L3d). */
    private static final Pattern MAPPING_ID = Pattern.compile("[a-z][a-z0-9_]{0,62}");
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    /** codemap 이 있으면 codemap 이 받는 기록된 위반. 공백도 codemap 이 표준 코드로 정하거나 멈춘다. */
    private static final Set<String> CODEMAP_HANDLED = Set.of("NOT_ALLOWED", "INVALID_DATE", "FORMAT", "BLANK");
    /** 대상 schema 를 밝히지 않은 대상 표의 기본 schema(연결의 현재 schema 를 모를 때). */
    public static final String DEFAULT_SCHEMA = "public";

    private final LoadCapabilities capabilities;

    public TermLedgerValidator() {
        this(new LoadCapabilities());
    }

    TermLedgerValidator(LoadCapabilities capabilities) {
        this.capabilities = Objects.requireNonNull(capabilities, "capabilities");
    }

    public List<String> validate(TermLedger ledger) {
        Objects.requireNonNull(ledger, "ledger");
        List<String> errors = new ArrayList<>();
        if (!Objects.equals(ledger.schemaVersion(), TermLedger.CURRENT_SCHEMA_VERSION)) {
            errors.add("원장 schemaVersion 은 " + TermLedger.CURRENT_SCHEMA_VERSION + " 이어야 합니다"
                    + (Objects.equals(ledger.schemaVersion(), 1) ? " — 형식 1 원장은 형식 2 로 옮기세요" : ""));
        }
        Set<String> ids = new HashSet<>();
        Set<String> confirmedKeys = new HashSet<>();
        Set<String> otherSources = new HashSet<>();
        Map<String, String> confirmedSources = new HashMap<>();
        Map<String, Entry> disposed = new LinkedHashMap<>();
        for (Entry entry : ledger.entries()) {
            String id = entry.id();
            if (id == null || !ID.matcher(id).matches()) {
                errors.add("원장 행 ID 형식이 맞지 않습니다");
                continue;
            }
            if (!ids.add(id)) {
                errors.add(id + ": 같은 ID 가 두 번 있습니다");
            }
            boolean sourced = complete(entry.source());
            if (!sourced) {
                errors.add(id + ": source 표·컬럼이 필요합니다");
            }
            if (entry.grade() == null || !GRADES.contains(entry.grade())) {
                errors.add(id + ": grade 는 EXACT·SYNONYM·INFERRED·UNKNOWN 중 하나여야 합니다");
            }
            if (entry.status() == null || !TRANSITIONS.containsKey(entry.status())) {
                errors.add(id + ": 알 수 없는 상태입니다");
                continue;
            }
            history(entry, errors);
            route(entry, errors);
            if (sourced) {
                unique(entry, confirmedKeys, otherSources, confirmedSources, disposed, errors);
            }
            nonStandardTarget(entry, errors);
            if (entry.load() != null) {
                loadShape(entry, entry.load(), errors);
            }
            if (entry.conformance() != null) {
                conformanceShape(entry, entry.conformance(), errors);
            }
            stateRequirements(entry, errors);
        }
        for (Map.Entry<String, Entry> disposal : disposed.entrySet()) {
            String confirmed = confirmedSources.get(disposal.getKey());
            if (confirmed != null) {
                Entry entry = disposal.getValue();
                errors.add(entry.id() + ": " + label(entry.source()) + " 을 " + entry.status() + " 로 처분했는데 확정 행("
                        + confirmed + ")이 같은 소스 컬럼을 옮깁니다");
            }
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

    /** mapping·via 는 확정 행에만, 정해진 식별자 형식으로 둔다. */
    private static void route(Entry entry, List<String> errors) {
        if (entry.mapping() == null && entry.via() == null) {
            return;
        }
        String id = entry.id();
        if (SOURCE_DISPOSITIONS.contains(entry.status())) {
            errors.add(id + ": 이관 제외·외부 보관 행에는 mapping·via 를 둘 수 없습니다 — 매핑과 무관하게 소스 컬럼을"
                    + " 처분합니다");
        } else if (!"CONFIRMED".equals(entry.status())) {
            errors.add(id + ": mapping·via 는 확정 행에만 둡니다");
        }
        if (entry.mapping() != null && !MAPPING_ID.matcher(entry.mapping()).matches()) {
            errors.add(id + ": mapping 은 매핑 id 형식(소문자로 시작하는 소문자·숫자·밑줄 63자 이내)이어야 합니다");
        }
        if (entry.mapping() != null && entry.via() != null) {
            // [ADR-0029 L3d] 조회 표의 컬럼을 읽는 매핑은 via.mapping 이다 — mapping 을 함께 두면 어느 매핑인지 갈린다.
            errors.add(id + ": 조회 경로(via) 행에는 mapping 을 두지 않습니다 — 그 컬럼을 읽는 매핑은 via.mapping 입니다");
        }
        if (entry.via() != null && (entry.via().mapping() == null || entry.via().lookup() == null
                || !MAPPING_ID.matcher(entry.via().mapping()).matches()
                || !MAPPING_ID.matcher(entry.via().lookup()).matches())) {
            errors.add(id + ": via 에는 매핑 id(mapping)와 조회 별칭(lookup)이 매핑 id 형식으로 필요합니다");
        }
    }

    /**
     * 확정 행은 (소스 표, 소스 컬럼, 실효 mapping, via, 대상 컬럼) 으로 유일하다 — mapping 을 생략하면 그 소스의 기본
     * 매핑이다. 한 소스 컬럼은 대상 컬럼마다 확정 행을 둘 수 있다(등록자 ID 를 최초·최종 등록자로 함께 옮기는 식). 거꾸로
     * 한 대상 컬럼을 두 소스 컬럼이 채우는 원장은 coverage 의 역방향(확정 행은 모두 mapping 에)과 mapping 정적 검증(한
     * 타깃 컬럼에 컬럼 항목 하나)이 함께 막는다 — 다른 소스 표가 같은 대상 표를 채우는 병합은 막지 않는다. 확정되지 않은
     * 행은 소스 컬럼마다 하나다. 이관 제외·보관한 소스 컬럼을 확정 행이 옮기면 안 된다(반복 뒤에 판정한다).
     */
    private static void unique(Entry entry, Set<String> confirmedKeys, Set<String> otherSources,
                               Map<String, String> confirmedSources, Map<String, Entry> disposed,
                               List<String> errors) {
        String source = key(entry.source());
        if ("CONFIRMED".equals(entry.status())) {
            String via = entry.via() == null ? "" : entry.via().mapping() + '/' + entry.via().lookup();
            String effective = entry.mapping() == null ? "" : entry.mapping();
            String target = entry.target() == null || entry.target().column() == null ? ""
                    : entry.target().column().toLowerCase(Locale.ROOT);
            if (!confirmedKeys.add(source + '\u0000' + effective + '\u0000' + via + '\u0000' + target)) {
                errors.add(entry.id() + ": 같은 소스 컬럼(" + label(entry.source())
                        + ")이 같은 매핑·조회 경로와 대상 컬럼으로 두 번 확정됐습니다");
            }
            confirmedSources.putIfAbsent(source, entry.id());
            return;
        }
        if (!otherSources.add(source)) {
            errors.add(entry.id() + ": 같은 소스 컬럼(" + label(entry.source()) + ")이 두 행에 있습니다");
        }
        if (SOURCE_DISPOSITIONS.contains(entry.status())) {
            disposed.putIfAbsent(source, entry);
        }
    }

    /** 비표준 대상은 사유와 함께, 표준 용어 대신, 대상이 있는 행에만 둔다(DEC-OPS-317 U1). */
    private static void nonStandardTarget(Entry entry, List<String> errors) {
        if (entry.nonStandardTarget() == null) {
            return;
        }
        String id = entry.id();
        if (blank(entry.nonStandardTarget().reason())) {
            errors.add(id + ": 비표준 대상(nonStandardTarget)에는 사유(reason)가 필요합니다");
        }
        if (entry.term() != null) {
            errors.add(id + ": 표준 용어(term)와 비표준 대상(nonStandardTarget)을 함께 둘 수 없습니다");
        }
        if (SOURCE_DISPOSITIONS.contains(entry.status())) {
            errors.add(id + ": 이관 제외·외부 보관 행에는 비표준 대상을 둘 수 없습니다");
        }
    }

    /** load 의 형식. 확정 여부와 무관하게 load 가 있으면 본다(초안이 미리 채운 load 포함). */
    private void loadShape(Entry entry, Load load, List<String> errors) {
        String id = entry.id();
        if (load.transform() != null && !capabilities.builtin(load.transform())) {
            errors.add(id + ": load.transform 은 내장 변환기 이름이어야 합니다");
        }
        if (load.type() != null && !TypeConverter.isKnown(load.type())) {
            errors.add(id + ": load.type 은 mapping 이 아는 type 이어야 합니다");
        }
        if (load.codemap() != null && !LoadCapabilities.codemapName(load.codemap())) {
            errors.add(id + ": load.codemap 은 codemap 이름 형식(영문·숫자·_.- 64자 이내)이어야 합니다");
        }
        if (capabilities.domain(load.transform()) && (load.type() != null || load.codemap() != null)) {
            errors.add(id + ": 표준 도메인 변환기는 load 의 type·codemap 과 함께 쓸 수 없습니다 — 변환기가 대상 표기를"
                    + " 정합니다");
        }
        Set<DomainViolation> producible = capabilities.nullifiable(load);
        Set<DomainViolation> declared = EnumSet.noneOf(DomainViolation.class);
        for (MappingSpec.Nullify rule : load.nullify()) {
            if (rule.violation() == null) {
                errors.add(id + ": load.nullify 항목에는 violation 이 필요합니다");
                continue;
            }
            if (!LoadCapabilities.nullifyCode(rule.violation())) {
                errors.add(id + ": load.nullify 는 BLANK·PLACEHOLDER_DATE 위반에만 선언할 수 있습니다");
            } else if (!producible.contains(rule.violation())) {
                errors.add(id + ": load.nullify " + rule.violation() + " 는 이 load 가 내지 않는 위반입니다 — BLANK 는"
                        + " 표준 도메인 변환기나 비문자 type, PLACEHOLDER_DATE 는 날짜 변환기가 냅니다");
            }
            if (rule.maxRows() == null || rule.maxRows() < 1) {
                errors.add(id + ": load.nullify maxRows 는 1 이상이어야 합니다");
            }
            if (!declared.add(rule.violation())) {
                errors.add(id + ": load.nullify 에 같은 위반을 두 번 선언할 수 없습니다");
            }
        }
    }

    /** conformance 의 형식. 확정 여부와 무관하게 conformance 가 있으면 본다(초안 포함). */
    private void conformanceShape(Entry entry, Conformance conformance, List<String> errors) {
        String id = entry.id();
        if (conformance.rate() != null && (conformance.rate().signum() < 0
                || conformance.rate().compareTo(HUNDRED) > 0)) {
            errors.add(id + ": conformance.rate 는 0~100 이어야 합니다");
        }
        if (!conformance.unmeasured().stream().allMatch(reason -> reason != null
                && LoadCapabilities.UNMEASURED.contains(reason))
                || Set.copyOf(nonNull(conformance.unmeasured())).size() != conformance.unmeasured().size()) {
            errors.add(id + ": conformance.unmeasured 에는 추정기 이유(UNSUPPORTED_VALUE_TYPE·LENGTH_EXCEEDED·"
                    + "LENGTH_UNVERIFIED·ALLOWED_VALUES_UNVERIFIED·SAMPLED)만 한 번씩 둡니다");
        }
        if (conformance.rate() != null && !conformance.unmeasured().isEmpty()) {
            errors.add(id + ": 적합률(rate)을 셌으면 셀 수 없었던 이유(unmeasured)를 둘 수 없습니다");
        }
        if (!capabilities.hint(conformance.transform())) {
            errors.add(id + ": conformance.transform 은 mapping 어휘(transform:<내장 변환기>·type:<type>·codemap·"
                    + "mixed)여야 합니다");
        }
        Set<String> types = new HashSet<>();
        for (ViolationCount violation : conformance.violations()) {
            if (violation == null || violation.type() == null || !LoadCapabilities.COUNTED.contains(violation.type())
                    || violation.rows() == null || violation.rows() < 1 || !types.add(violation.type())) {
                errors.add(id + ": conformance.violations 에는 셀 수 있는 위반(BLANK·PLACEHOLDER_DATE·INVALID_DATE·"
                        + "FORMAT·NOT_ALLOWED)을 1 이상의 행 수와 한 번씩 둡니다");
                break;
            }
        }
        ApprovedExceptions exceptions = conformance.approvedExceptions();
        if (exceptions != null) {
            if (exceptions.maxRows() == null || exceptions.maxRows() < 1
                    || exceptions.maxRows() > LoadCapabilities.MAX_EXCEPTION_ROWS) {
                errors.add(id + ": 승인 예외 maxRows 는 1~" + LoadCapabilities.MAX_EXCEPTION_ROWS + " 이어야 합니다");
            }
            if (blank(exceptions.reason())) {
                errors.add(id + ": 승인 예외에는 사유(reason)가 필요합니다");
            }
            if (exceptions.violations().isEmpty()) {
                errors.add(id + ": 승인 예외에는 격리할 위반(violations)이 필요합니다");
            } else if (!exceptions.violations().stream().allMatch(code -> code != null
                    && LoadCapabilities.ISOLATABLE.contains(code))
                    || Set.copyOf(nonNull(exceptions.violations())).size() != exceptions.violations().size()) {
                errors.add(id + ": 승인 예외의 위반은 격리할 수 있는 코드(INVALID_DATE·PLACEHOLDER_DATE·TIME_PRESENT·"
                        + "FORMAT·BLANK·CODEMAP_UNMAPPED·LENGTH_EXCEEDED·PRECISION_EXCEEDED·REQUIRED_MISSING)를 한 번씩"
                        + " 둡니다");
            }
        }
    }

    private void stateRequirements(Entry entry, List<String> errors) {
        String id = entry.id();
        switch (entry.status()) {
            case "CONFIRMED" -> confirmed(entry, errors);
            case "APPROVED_IGNORE" -> {
                if (blank(entry.note())) {
                    errors.add(id + ": 이관 제외에는 사유(note)가 필요합니다");
                }
            }
            case "ARCHIVE" -> {
                if (entry.archive() == null || date(entry.archive().retainUntil()) == null) {
                    errors.add(id + ": 외부 보관에는 보존 기한(archive.retainUntil, yyyy-MM-dd)이 필요합니다");
                }
                // [DEC-OPS-321 U2] 덤프는 원시 값을 담고 주민등록번호 모양은 과잉 탐지라 가리지 않는다 — 사람이 확인해야 한다.
                if (entry.archive() == null
                        || !TermLedger.Archive.PERSONAL_DATA_ACKNOWLEDGED.equals(entry.archive().personalData())) {
                    errors.add(id + ": 외부 보관에는 덤프(정렬 키 값 포함)가 주민등록번호·전화번호·이메일 모양 값을 가리지 않고"
                            + " 기관 통제 아래 남긴다는 사람 확인(archive.personalData: acknowledged)이 필요합니다");
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

    private void confirmed(Entry entry, List<String> errors) {
        String id = entry.id();
        boolean nonStandard = entry.nonStandardTarget() != null;
        if (!nonStandard && !complete(entry.term())) {
            errors.add(id + ": 확정에는 표준 용어(이름·영문약어·도메인)가 필요합니다 — 표준 용어가 없는 대상 컬럼이면"
                    + " nonStandardTarget 으로 확정합니다");
        }
        if (!complete(entry.target())) {
            errors.add(id + ": 확정에는 대상 표·컬럼이 필요합니다");
        } else if (!nonStandard && complete(entry.term())
                && !entry.target().column().equalsIgnoreCase(entry.term().engAbbr())) {
            errors.add(id + ": 대상 컬럼(" + entry.target().column() + ")이 표준 영문약어("
                    + entry.term().engAbbr() + ")와 다릅니다");
        }
        if (!nonStandard && "UNKNOWN".equals(entry.grade())) {
            errors.add(id + ": 근거가 없는(UNKNOWN) 행은 확정할 수 없습니다");
        }
        Load load = entry.load();
        if (load == null) {
            errors.add(id + ": 확정에는 load(변환·type·codemap·nullify, 변환이 없으면 {})가 필요합니다");
        } else if (capabilities.refines(load) && blank(entry.note())) {
            errors.add(id + ": 값을 규칙으로 바꾸는 load(시각 버림·자정 붙임 변환기, nullify)에는 사유(note)가 필요합니다");
        }
        if (nonStandard) {
            if (entry.conformance() != null) {
                errors.add(id + ": 비표준 대상 행에는 conformance 를 두지 않습니다 — 대조할 표준 도메인이 없습니다");
            }
            return;
        }
        if (load != null && complete(entry.term())) {
            DomainCategory category = DomainCategory.of(entry.term().domain(), null);
            if (!capabilities.guarded(category, load)) {
                errors.add(id + ": " + category + " 범주 도메인 컬럼의 load 에는 " + LoadCapabilities.guardLabel(category)
                        + " 가 필요합니다");
            }
        }
        confirmedConformance(entry, load, errors);
    }

    /**
     * 확정 행의 적합성. 적합률(참고값) 또는 셀 수 없었던 이유와 사유가 있어야 하고, 기록된 위반은 모두 실행 시점 처리가,
     * 셀 수 없었던 위반은 행 단위 판정이 있어야 한다. 일부만 읽은 프로파일로는 확정할 수 없다.
     */
    private void confirmedConformance(Entry entry, Load load, List<String> errors) {
        String id = entry.id();
        Conformance conformance = entry.conformance();
        if (conformance == null || (conformance.rate() == null && conformance.unmeasured().isEmpty())) {
            errors.add(id + ": 확정에는 적합률(conformance.rate)이나 셀 수 없었던 이유(conformance.unmeasured)가"
                    + " 필요합니다");
            return;
        }
        if (conformance.rate() == null && blank(entry.note())) {
            errors.add(id + ": 적합률을 셀 수 없었던(unmeasured) 행의 확정에는 사유(note)가 필요합니다");
        }
        if (conformance.rate() != null && conformance.rate().compareTo(HUNDRED) < 0
                && conformance.approvedExceptions() == null
                && conformance.violations().stream().noneMatch(violation -> violation != null
                && violation.type() != null && LoadCapabilities.COUNTED.contains(violation.type())
                && violation.rows() != null && violation.rows() > 0)) {
            // 추정기는 적합률을 센 위반으로만 낮춘다 — 위반 기록을 지워 처리 없이 확정하는 길을 막는다.
            errors.add(id + ": 적합률이 100 미만인데 기록된 위반이나 승인 예외가 없습니다 — 추정기 초안의 위반 기록을"
                    + " 지우지 마세요");
        }
        if (LoadCapabilities.HINT_MIXED.equals(conformance.transform()) && (load == null || load.transform() == null)) {
            errors.add(id + ": 모양마다 다른 변환이 필요한(mixed) 컬럼은 load.transform 을 정해야 확정할 수 있습니다");
        }
        for (String reason : conformance.unmeasured()) {
            String problem = unmeasured(reason, load, entry);
            if (problem != null) {
                errors.add(id + ": " + problem);
            }
        }
        if (load == null) {
            return;
        }
        Set<String> approved = conformance.approvedExceptions() == null ? Set.of()
                : Set.copyOf(nonNull(conformance.approvedExceptions().violations()));
        for (ViolationCount violation : conformance.violations()) {
            if (violation == null || violation.type() == null || !LoadCapabilities.COUNTED.contains(violation.type())) {
                continue;
            }
            String problem = unhandled(violation.type(), load, approved);
            if (problem != null) {
                errors.add(id + ": 기록된 위반 " + violation.type() + "(" + violation.rows() + "행)을 처리하지 않습니다 — "
                        + problem);
            }
        }
    }

    /** 셀 수 없었던 위반에 실행 시점 판정이 있는가. 있으면 null, 없으면 그 문구. */
    private String unmeasured(String reason, Load load, Entry entry) {
        if (reason == null) {
            return null;
        }
        return switch (reason) {
            case "SAMPLED" -> "일부만 읽은 프로파일(SAMPLED)로는 확정할 수 없습니다 — 행 제한 없이 프로파일을 다시"
                    + " 만드세요";
            case "UNSUPPORTED_VALUE_TYPE" -> capabilities.judgesValueType(load) ? null
                    : "추정기가 판정하지 못한 값 종류(UNSUPPORTED_VALUE_TYPE)가 있어 load 가 행마다 판정해야 합니다 —"
                    + " 표준 도메인 변환기나 type 을 두세요";
            // 길이·자릿수 초과는 쓰기 단계와 정적 판정이 멈춘다(fail-closed). [DEC-OPS-322] 승인 예외에 LENGTH_EXCEEDED·
            //   PRECISION_EXCEEDED 가 있으면 그 컬럼의 선언 길이·정밀도 정적 판정을 값 한계 가드로 옮겨 상한 안의 행을
            //   격리한다. 그 코드를 승인하지 않은 컬럼은 정적 판정이 그대로 멈춘다(TargetStandardValidator).
            case "LENGTH_EXCEEDED", "LENGTH_UNVERIFIED" -> null;
            // DEC-OPS-317 U3: codemap(unmapped: fail)이 없으면 사유로 확정한다 — 허용값 대사는 L4 가 맡는다.
            case "ALLOWED_VALUES_UNVERIFIED" -> (load != null && load.codemap() != null) || !blank(entry.note()) ? null
                    : "허용값을 확인하지 못한(ALLOWED_VALUES_UNVERIFIED) 컬럼은 codemap 이나 사유(note)가 있어야 확정할 수"
                    + " 있습니다";
            default -> null;
        };
    }

    /** 기록된 위반 하나의 실행 시점 처리. 처리되면 null, 아니면 무엇이 필요한지의 문구. */
    private String unhandled(String type, Load load, Set<String> approved) {
        String code = capabilities.runtimeCode(load, type);
        return switch (type) {
            // codemap 은 공백을 표준 코드로 정하거나(공백 키) unmapped: fail 로 멈춘다 — 허용값 밖 코드와 같은 처리다.
            case "BLANK" -> LoadCapabilities.CODEMAP_UNMAPPED.equals(code)
                    || (DomainViolation.BLANK.name().equals(code) && (LoadCapabilities.nullified(load,
                    DomainViolation.BLANK) || approved.contains("BLANK"))) ? null
                    : "공백을 판정하는 load(표준 도메인 변환기·비문자 type)에 nullify BLANK 나 승인 예외 BLANK 를 두거나,"
                    + " codemap(unmapped: fail)으로 공백의 표준 코드를 정하세요";
            case "PLACEHOLDER_DATE" -> DomainViolation.PLACEHOLDER_DATE.name().equals(code)
                    && (LoadCapabilities.nullified(load, DomainViolation.PLACEHOLDER_DATE)
                    || approved.contains("PLACEHOLDER_DATE")) ? null
                    : "날짜 도메인 변환기에 nullify PLACEHOLDER_DATE 나 승인 예외 PLACEHOLDER_DATE 를 두세요";
            case "INVALID_DATE", "FORMAT" -> code == null
                    ? "그 값을 판정하는 load(표준 도메인 변환기·비문자 type·codemap)가 필요합니다"
                    : approved.contains(code) ? null : "이 load 는 그 값을 " + code + " 로 멈추므로 승인 예외에 " + code
                    + " 가 필요합니다";
            case "NOT_ALLOWED" -> load.codemap() != null ? null
                    : "허용값 밖 코드는 codemap(unmapped: fail)으로만 처리합니다 — 격리할 수 없습니다";
            default -> null;
        };
    }

    /**
     * mapping 과 원장을 승인 inventory 의 표·컬럼으로 맞춘다(ADR-0029 L3a-2, DEC-OPS-317). 표·컬럼 표기는
     * {@link InventoryTables} 규칙으로 해석하므로 원장과 mapping 이 같은 표를 다르게 적어도 같은 컬럼으로 본다.
     *
     * <ol>
     *   <li>충돌 — 표기가 다른 행도 같은 inventory 컬럼이면 확정되지 않은 행은 하나이고, 처분한 컬럼을 확정 행이
     *       옮기지 않는다.</li>
     *   <li>정방향 — mapping 이 소스 컬럼에서 옮기는 컬럼(상수 아님, fkRef 포함)마다 같은 소스·같은 매핑 id·대상의 확정
     *       행이 하나 있고, mapping 의 transform·type·codemap·nullify 가 그 행의 load 와 정확히 같다. 원장 행의 mapping 을
     *       생략하면 그 소스의 기본 매핑(id 없음)이다(ADR-0029 L3c). fkRef 컬럼의 load 는 키 정규화뿐이다(생성기와 같은 판정).
     *       mapping 의 isolate 는 그 행의 승인 예외 가운데 nullify 로 덮이지 않는 위반과 양방향으로 정확히 같다
     *       ({@link LoadCapabilities#isolate}, ADR-0029 L3b).</li>
     *   <li>역방향 — 확정 행은 모두 mapping 에 있다. 확정 행의 매핑 id 가 mapping 에 없거나, mapping 이 읽지 않는 소스 표의
     *       확정 행이면 오류다.</li>
     *   <li>외부 보관(ADR-0029 L3e) — mapping 의 보관 선언과 원장 ARCHIVE 행이 양방향으로 정확히 같다(같은 컬럼·순서·보존
     *       기한, 행마다 정확히 한 선언).</li>
     *   <li>소스 단위 완전성 — mapping 이 읽는 소스 표와 덤프만 하는 표의 모든 inventory 컬럼은 확정 행이 하나 이상이거나
     *       이관 제외·외부 보관 행이 정확히 하나다.</li>
     * </ol>
     *
     * <p>[ADR-0029 L3d] 조회 컬럼({@code alias.COLUMN})은 조회 표의 inventory 컬럼으로 풀어, 같은 조회 경로({@code via}:
     * 그 매핑 id·별칭)의 확정 행과 맞춘다. 조회만 하는 표도 소스 단위 완전성을 받는다 — 조회 키처럼 옮기지 않는 컬럼은
     * 이관 제외와 사유로 적는다.</p>
     *
     * <p>문구는 행 ID·표·컬럼·상태와 고정 어휘다.</p>
     */
    public List<String> coverage(TermLedger ledger, MappingSpec mapping, CatalogSnapshot inventory) {
        Objects.requireNonNull(ledger, "ledger");
        Objects.requireNonNull(mapping, "mapping");
        Objects.requireNonNull(inventory, "inventory");
        List<String> errors = new ArrayList<>();
        Map<String, InventoryTables.TableColumns> columnsByTable = new HashMap<>();
        Set<String> reported = new HashSet<>();
        List<Entry> entries = ledger.entries();
        List<CatalogObject> rowTables = new ArrayList<>();
        List<CatalogObject> rowColumns = new ArrayList<>();
        for (Entry entry : entries) {
            CatalogObject table = null;
            CatalogObject column = null;
            if (complete(entry.source())) {
                InventoryTables.Resolution resolution = InventoryTables.resolve(inventory, entry.source().table());
                if (!resolution.resolved()) {
                    errors.add(row(entry) + ": " + resolution.problem());
                } else {
                    table = resolution.table();
                    InventoryTables.TableColumns columns = tableColumns(inventory, table, entry.source().table(),
                            columnsByTable, reported, errors);
                    column = columns.columns().stream()
                            .filter(candidate -> InventoryTables.columnMatches(entry.source().column(), candidate))
                            .findFirst().orElse(null);
                    if (column == null && columns.problem() == null) {
                        errors.add(row(entry) + ": 소스 컬럼이 inventory 의 이 표에 없습니다");
                    }
                }
            }
            rowTables.add(table);
            rowColumns.add(column);
        }
        conflicts(entries, rowColumns, errors);

        Map<String, CatalogObject> mappedTables = new LinkedHashMap<>();
        // 매핑이 주 소스로 읽는 표(조회만 하는 표 제외) — 보관 선언이 매핑의 읽기에 붙는지 정한다(ADR-0029 L3e·L3d).
        Set<String> readSources = new HashSet<>();
        Set<String> mappedIds = new HashSet<>();
        Map<String, MappingSpec.TableMapping> byId = new HashMap<>();
        Set<Integer> used = new HashSet<>();
        Set<CatalogObject> mappedColumns = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        for (MappingSpec.TableMapping table : mapping.tables()) {
            if (table.id() != null) {
                byId.putIfAbsent(table.id(), table);
            }
            InventoryTables.Resolution resolution = InventoryTables.resolve(inventory, table.source());
            if (!resolution.resolved()) {
                errors.add("mapping 소스 표 " + table.source() + ": " + resolution.problem());
                continue;
            }
            CatalogObject sourceTable = resolution.table();
            mappedTables.putIfAbsent(sourceTable.stableId(), sourceTable);
            readSources.add(sourceTable.stableId());
            mappedIds.add(sourceTable.stableId() + '\u0000' + table.effectiveId());
            InventoryTables.TableColumns columns = tableColumns(inventory, sourceTable, table.source(),
                    columnsByTable, reported, errors);
            for (MappingSpec.ColumnMapping column : table.columns()) {
                if (column.source() == null || column.constant() != null || LookupRef.parse(column.source()) != null) {
                    continue; // 조회 컬럼은 아래에서 조회 표로 맞춘다.
                }
                forward(table, column, column.source(), columns, entries, rowColumns, used, mappedColumns,
                        entry -> directConfirmed(entry) && effectiveMapping(entry).equals(table.effectiveId()),
                        errors);
            }
            for (MappingSpec.Lookup lookup : table.lookups()) {
                if (lookup == null || lookup.source() == null || lookup.alias() == null) {
                    continue; // 선언 오류는 mapping 정적 검증(LookupRules)이 알린다.
                }
                InventoryTables.Resolution lookupResolution = InventoryTables.resolve(inventory, lookup.source());
                if (!lookupResolution.resolved()) {
                    errors.add("mapping 조회 표 " + lookup.source() + ": " + lookupResolution.problem());
                    continue;
                }
                CatalogObject lookupTable = lookupResolution.table();
                mappedTables.putIfAbsent(lookupTable.stableId(), lookupTable);
                InventoryTables.TableColumns lookupColumns = tableColumns(inventory, lookupTable, lookup.source(),
                        columnsByTable, reported, errors);
                for (MappingSpec.ColumnMapping column : table.columns()) {
                    LookupRef ref = LookupRef.parse(column.source());
                    if (ref == null || column.constant() != null || !lookup.alias().equals(ref.alias())) {
                        continue;
                    }
                    forward(table, column, ref.column(), lookupColumns, entries, rowColumns, used, mappedColumns,
                            entry -> viaConfirmed(entry, table.effectiveId(), lookup.alias()), errors);
                }
            }
        }

        for (int index = 0; index < entries.size(); index++) {
            Entry entry = entries.get(index);
            CatalogObject table = rowTables.get(index);
            InventoryTables.TableColumns columns = table == null ? null : columnsByTable.get(table.stableId());
            if (!"CONFIRMED".equals(entry.status()) || table == null || used.contains(index)
                    || (columns != null && columns.problem() != null) || rowColumns.get(index) == null) {
                continue; // 찾지 못한 컬럼·열거하지 못한 표는 그 사유 하나로 알린다.
            }
            if (entry.via() != null) {
                errors.add(row(entry) + unusedVia(entry, table, byId, inventory));
                continue;
            }
            errors.add(row(entry) + (!mappedTables.containsKey(table.stableId())
                    ? ": mapping 이 읽지 않는 소스 표의 확정 행입니다 — mapping-generate 로 다시 만드세요"
                    : !mappedIds.contains(table.stableId() + '\u0000' + effectiveMapping(entry))
                    ? ": 확정 행의 매핑(" + mappingLabel(entry) + ")이 mapping 에 없습니다 — skeleton 에 그 id 의 매핑을 두고"
                            + " mapping-generate 로 다시 만드세요"
                    : ": 확정 행이 mapping 에 없습니다 — mapping-generate 로 다시 만드세요"));
        }

        Map<String, CatalogObject> dumpOnlyTables = archives(mapping, inventory, entries, rowColumns, readSources,
                columnsByTable, reported, errors);

        // 조회만 하는 표를 덤프하면 두 목록에 함께 있다 — 한 번만 본다.
        Map<String, CatalogObject> sourceTables = new LinkedHashMap<>(mappedTables);
        dumpOnlyTables.forEach(sourceTables::putIfAbsent);
        for (CatalogObject table : sourceTables.values()) {
            InventoryTables.TableColumns columns = columnsByTable.get(table.stableId());
            if (columns == null || columns.problem() != null) {
                continue;
            }
            for (CatalogObject column : columns.columns()) {
                if (mappedColumns.contains(column)) {
                    continue; // mapping 이 읽는 컬럼은 정방향이 기본 확정 행을 요구했다.
                }
                int confirmed = 0;
                int disposed = 0;
                Entry other = null;
                for (int index = 0; index < entries.size(); index++) {
                    if (rowColumns.get(index) != column) {
                        continue;
                    }
                    Entry entry = entries.get(index);
                    if ("CONFIRMED".equals(entry.status())) {
                        confirmed++;
                    } else if (SOURCE_DISPOSITIONS.contains(entry.status())) {
                        disposed++;
                    } else if (other == null) {
                        other = entry;
                    }
                }
                if (confirmed > 0 || disposed > 0) {
                    continue; // 처분 행이 둘 이상이거나 확정 행과 함께 있으면 conflicts 가 알렸다.
                }
                String where = InventoryTables.columnName(column);
                errors.add(other == null
                        ? table.name() + "." + where + ": mapping·원장 어디에도 없는 컬럼입니다 — 옮기면 확정하고, 키로만"
                                + " 쓰거나 옮기지 않으면 이관 제외(APPROVED_IGNORE)와 사유를 적으세요"
                        : row(other) + ": 소스 표의 컬럼이 확정·이관 제외·외부 보관 중 하나로 정해지지 않았습니다");
            }
        }
        return errors;
    }

    /**
     * 조회 경로 행이 mapping 에 쓰이지 않은 사유(ADR-0029 L3d). 읽는 매핑이 없거나, 그 매핑이 별칭을 선언하지 않았거나,
     * 별칭이 다른 표를 읽거나, 그 컬럼을 읽는 항목이 없다.
     */
    private static String unusedVia(Entry entry, CatalogObject table, Map<String, MappingSpec.TableMapping> byId,
                                    CatalogSnapshot inventory) {
        MappingSpec.TableMapping reader = byId.get(entry.via().mapping());
        if (reader == null) {
            return ": 조회 경로의 매핑(" + entry.via().mapping() + ")이 mapping 에 없습니다 — skeleton 에 그 id 의 매핑을 두고"
                    + " mapping-generate 로 다시 만드세요";
        }
        MappingSpec.Lookup lookup = reader.lookup(entry.via().lookup());
        if (lookup == null) {
            return ": 조회 경로의 별칭(" + entry.via().lookup() + ")을 매핑 " + entry.via().mapping()
                    + " 이 선언하지 않았습니다 — skeleton 의 그 매핑에 lookups 를 두세요";
        }
        InventoryTables.Resolution resolution = InventoryTables.resolve(inventory, lookup.source());
        if (!resolution.resolved() || !resolution.table().stableId().equals(table.stableId())) {
            return ": 조회 별칭(" + entry.via().mapping() + "/" + entry.via().lookup() + ")이 읽는 표가 원장 행의 소스 표와"
                    + " 다릅니다";
        }
        return ": 확정 행이 mapping 에 없습니다 — mapping-generate 로 다시 만드세요";
    }

    /**
     * mapping 컬럼 하나를 같은 inventory 컬럼의 확정 행과 맞춘다. {@code mine} 은 이 컬럼이 쓸 수 있는 확정 행 — 직접 옮기면
     * 같은 매핑 id 의 조회 경로 없는 행, 조회 컬럼이면 같은 매핑 id·별칭의 조회 경로 행이다(ADR-0029 L3d).
     */
    private static void forward(MappingSpec.TableMapping table, MappingSpec.ColumnMapping column, String sourceColumn,
                                InventoryTables.TableColumns columns, List<Entry> entries,
                                List<CatalogObject> rowColumns, Set<Integer> used,
                                Set<CatalogObject> mappedColumns, Predicate<Entry> mine, List<String> errors) {
        String where = MappingIndex.label(table) + "." + column.source();
        if (columns.problem() != null) {
            return;
        }
        CatalogObject inventoryColumn = columns.columns().stream()
                .filter(candidate -> InventoryTables.columnMatches(sourceColumn, candidate))
                .findFirst().orElse(null);
        if (inventoryColumn == null) {
            errors.add(where + ": 소스 컬럼이 inventory 의 이 표에 없습니다");
            return;
        }
        mappedColumns.add(inventoryColumn);
        List<Integer> confirmed = new ArrayList<>();
        List<Integer> sameTarget = new ArrayList<>();
        Entry unconfirmed = null;
        Entry elsewhere = null;
        for (int index = 0; index < entries.size(); index++) {
            if (rowColumns.get(index) != inventoryColumn) {
                continue;
            }
            Entry entry = entries.get(index);
            if (mine.test(entry)) {
                confirmed.add(index);
                // 한 소스 컬럼은 대상 컬럼마다 확정 행을 둘 수 있으므로 같은 대상의 행과 맞춘다.
                if (complete(entry.target()) && entry.target().column().equalsIgnoreCase(column.target())) {
                    sameTarget.add(index);
                }
            } else if ("CONFIRMED".equals(entry.status())) {
                elsewhere = elsewhere == null ? entry : elsewhere;
            } else if (unconfirmed == null) {
                unconfirmed = entry;
            }
        }
        if (sameTarget.size() > 1) {
            errors.add(where + ": 같은 소스 컬럼·매핑·대상 컬럼의 확정 행이 둘 이상입니다(원장 표 표기가 다른 행)");
            return;
        }
        if (confirmed.isEmpty()) {
            errors.add(elsewhere != null
                    ? where + ": 이 매핑의 확정 행이 없습니다 — 원장 행 " + elsewhere.id() + " 은 다른 mapping·조회 경로입니다"
                    : unconfirmed != null
                    ? where + ": 원장 행 " + unconfirmed.id() + " 이 확정되지 않았습니다(" + unconfirmed.status() + ")"
                    : where + ": 원장에 없는 매핑입니다");
            return;
        }
        int index = sameTarget.isEmpty() ? confirmed.getFirst() : sameTarget.getFirst();
        Entry entry = entries.get(index);
        used.add(index);
        if (!complete(entry.target())
                || !entry.target().table().equalsIgnoreCase(table.target())
                || !entry.target().column().equalsIgnoreCase(column.target())) {
            errors.add(where + ": 원장 행 " + entry.id() + " 의 대상과 mapping 의 대상("
                    + table.target() + "." + column.target() + ")이 다릅니다");
            return;
        }
        Load load = entry.load() == null ? new Load(null, null, null, List.of()) : entry.load();
        if (column.fkRef() != null && !column.fkRef().isBlank() && !LoadCapabilities.keyNormalization(load)) {
            errors.add(where + ": fkRef 컬럼의 원장 행 " + entry.id() + " load 는 키를 정규화하는 처리(trim·upper·"
                    + "lower·문자 type)만 받습니다 — 표준 도메인 변환기·codemap·nullify 는 부모 키를 바꿉니다");
        }
        // [ADR-0029 L4-B R3] 생성기와 같은 판정을 실제로 실행될 mapping 컬럼에 다시 한다 — 손으로 쓴 mapping 도 막힌다.
        if (LoadCapabilities.untrimmedFixedWidthCodemap(column.transform(), column.codemap(), inventoryColumn)) {
            errors.add(where + "(원장 행 " + entry.id() + "): " + LoadCapabilities.FIXED_WIDTH_TRIM_REQUIRED);
        }
        if (!Objects.equals(column.transform(), load.transform()) || !Objects.equals(column.type(), load.type())
                || !Objects.equals(column.codemap(), load.codemap())
                || !Objects.equals(nonNullList(column.nullify()), load.nullify())) {
            errors.add(where + ": mapping 의 변환(transform·type·codemap·nullify)이 원장 행 " + entry.id()
                    + " 의 load 와 다릅니다 — mapping-generate 로 다시 만드세요");
        }
        // [ADR-0029 L3b] 격리는 원장 승인 예외에서만 온다 — mapping 에만 있거나 원장에만 있거나 내용이 다르면 거부한다.
        if (!Objects.equals(column.isolate(), LoadCapabilities.isolate(entry))) {
            errors.add(where + ": mapping 의 격리(isolate)가 원장 행 " + entry.id() + " 의 승인 예외(nullify 로 NULL 이"
                    + " 되지 않는 위반)와 다릅니다 — mapping-generate 로 다시 만드세요");
        }
    }

    /**
     * [ADR-0029 L3e] mapping 의 보관 선언과 원장 외부 보관(ARCHIVE) 행을 양방향으로 맞춘다. 선언한 컬럼은 모두 같은
     * inventory 컬럼의 ARCHIVE 행(같은 순서의 {@code ledgerEntries}, 같은 보존 기한)이고, ARCHIVE 행은 모두 정확히 한 선언에
     * 있다. 매핑된 표의 보관은 그 매핑과 같은 source 표기로 적는다 — load 가 그 표기로 매핑의 읽기에 보관 컬럼을 붙인다.
     * 덤프만 하는 같은 표의 보관 선언끼리도 같은 표기를 쓴다 — load 가 표기마다 따로 읽는다.
     * 덤프만 하는 표의 정렬 키는 inventory 컬럼이어야 한다. 돌려주는 값은 덤프만 하는 표(inventory stableId → 표)이고 소스
     * 단위 완전성이 함께 본다.
     */
    private static Map<String, CatalogObject> archives(MappingSpec mapping, CatalogSnapshot inventory,
            List<Entry> entries, List<CatalogObject> rowColumns, Set<String> readSources,
            Map<String, InventoryTables.TableColumns> columnsByTable, Set<String> reported, List<String> errors) {
        Map<String, Integer> byId = new HashMap<>();
        for (int index = 0; index < entries.size(); index++) {
            if (entries.get(index).id() != null) {
                byId.putIfAbsent(entries.get(index).id(), index);
            }
        }
        Map<String, CatalogObject> dumpOnly = new LinkedHashMap<>();
        Map<String, String> dumpOnlyNotation = new HashMap<>();
        Set<Integer> archived = new HashSet<>();
        for (int position = 0; position < mapping.archives().size(); position++) {
            MappingSpec.ArchiveDump archive = mapping.archives().get(position);
            if (archive == null || blank(archive.source())) {
                continue; // 정적 mapping 검증이 위치와 함께 알린다.
            }
            String label = "보관 선언 archives[" + position + "]"
                    + (archive.id() != null && MAPPING_ID.matcher(archive.id()).matches() ? "(" + archive.id() + ")" : "");
            InventoryTables.Resolution resolution = InventoryTables.resolve(inventory, archive.source());
            if (!resolution.resolved()) {
                errors.add(label + " 소스 표 " + archive.source() + ": " + resolution.problem());
                continue;
            }
            CatalogObject table = resolution.table();
            InventoryTables.TableColumns columns = tableColumns(inventory, table, archive.source(), columnsByTable,
                    reported, errors);
            if (columns.problem() != null) {
                continue;
            }
            if (readSources.contains(table.stableId())) {
                if (mapping.mappedTableOf(archive.source()) == null) {
                    errors.add(label + ": 매핑된 소스 표를 매핑과 다른 표기(" + archive.source() + ")로 적었습니다 — 매핑과"
                            + " 같은 source 표기를 쓰세요");
                }
            } else {
                dumpOnly.putIfAbsent(table.stableId(), table);
                // 같은 표를 다른 표기로 적으면 mapping 검증·load 가 다른 표로 보아 따로 읽는다 — 한 번 읽어 나눠 쓰지 않는다.
                String notation = archive.source().trim().toLowerCase(Locale.ROOT);
                String first = dumpOnlyNotation.putIfAbsent(table.stableId(), notation);
                if (first != null && !first.equals(notation)) {
                    errors.add(label + ": 덤프만 하는 소스 표를 다른 보관 선언과 다른 표기(" + archive.source() + ")로"
                            + " 적었습니다 — 같은 표의 보관 선언은 같은 source 표기를 쓰세요");
                }
                for (String key : archive.orderByKeys()) {
                    if (key != null && columns.columns().stream()
                            .noneMatch(candidate -> InventoryTables.columnMatches(key, candidate))) {
                        errors.add(label + ": 정렬 키 " + key + " 가 inventory 의 이 표에 없습니다");
                    }
                }
            }
            int pairs = Math.min(archive.columns().size(), archive.ledgerEntries().size());
            for (int pair = 0; pair < pairs; pair++) {
                String name = archive.columns().get(pair);
                String ledgerId = archive.ledgerEntries().get(pair);
                CatalogObject column = name == null ? null : columns.columns().stream()
                        .filter(candidate -> InventoryTables.columnMatches(name, candidate))
                        .findFirst().orElse(null);
                if (column == null) {
                    errors.add(label + ": 보관 컬럼 " + name + " 이 inventory 의 이 표에 없습니다");
                    continue;
                }
                Integer index = ledgerId == null ? null : byId.get(ledgerId);
                if (index == null) {
                    errors.add(label + ": 원장 행 " + ledgerId + " 이 원장에 없습니다");
                    continue;
                }
                Entry entry = entries.get(index);
                if (!"ARCHIVE".equals(entry.status())) {
                    errors.add(label + ": 원장 행 " + entry.id() + " 은 외부 보관(ARCHIVE) 행이 아닙니다("
                            + entry.status() + ")");
                    continue;
                }
                if (rowColumns.get(index) != column) {
                    errors.add(label + ": 원장 행 " + entry.id() + " 의 소스 컬럼이 보관 컬럼 " + name + " 과 다릅니다");
                    continue;
                }
                if (entry.archive() == null || !Objects.equals(entry.archive().retainUntil(), archive.retainUntil())) {
                    errors.add(label + ": 보존 기한이 원장 행 " + entry.id() + " 과 다릅니다 — 보존 기한이 다른 행은 같은"
                            + " 덤프에 섞지 않습니다");
                }
                if (!archived.add(index)) {
                    errors.add(label + ": 원장 행 " + entry.id() + " 을 두 보관 선언이 가리킵니다");
                }
            }
        }
        for (int index = 0; index < entries.size(); index++) {
            Entry entry = entries.get(index);
            if ("ARCHIVE".equals(entry.status()) && !archived.contains(index) && rowColumns.get(index) != null) {
                errors.add(row(entry) + ": 외부 보관 행이 mapping 의 archives 에 없습니다 — mapping-generate 로 다시"
                        + " 만드세요");
            }
        }
        return dumpOnly;
    }

    /** 표의 컬럼을 한 번만 열거하고, 판정할 수 없으면 그 표마다 한 번 알린다. */
    private static InventoryTables.TableColumns tableColumns(CatalogSnapshot inventory, CatalogObject table,
            String label, Map<String, InventoryTables.TableColumns> columns, Set<String> reported,
            List<String> errors) {
        InventoryTables.TableColumns result = columns.computeIfAbsent(table.stableId(),
                key -> InventoryTables.columns(inventory, table));
        if (result.problem() != null && reported.add(table.stableId())) {
            errors.add(label + ": " + result.problem());
        }
        return result;
    }

    /**
     * 표기가 달라도 같은 inventory 컬럼을 가리키는 행끼리 {@link #validate} 의 소스 단위 규칙을 다시 본다 — 확정되지 않은
     * 행은 컬럼마다 하나이고, 이관 제외·외부 보관한 컬럼을 확정 행이 옮기지 않는다. 표기까지 같은 행은 validate 가
     * 이미 알렸으므로 표기가 다른 행만 알린다.
     */
    private static void conflicts(List<Entry> entries, List<CatalogObject> rowColumns, List<String> errors) {
        Map<CatalogObject, List<Integer>> byColumn = new LinkedHashMap<>();
        for (int index = 0; index < entries.size(); index++) {
            if (rowColumns.get(index) != null) {
                byColumn.computeIfAbsent(rowColumns.get(index), key -> new ArrayList<>()).add(index);
            }
        }
        for (List<Integer> rows : byColumn.values()) {
            Entry firstUnconfirmed = null;
            Entry firstConfirmed = null;
            for (int index : rows) {
                Entry entry = entries.get(index);
                if ("CONFIRMED".equals(entry.status())) {
                    firstConfirmed = firstConfirmed == null ? entry : firstConfirmed;
                } else if (firstUnconfirmed == null) {
                    firstUnconfirmed = entry;
                } else if (!key(firstUnconfirmed.source()).equals(key(entry.source()))) {
                    errors.add(row(entry) + ": 같은 소스 컬럼의 확정되지 않은 행(" + firstUnconfirmed.id()
                            + ")이 이미 있습니다(원장 표 표기가 다른 행)");
                }
            }
            if (firstConfirmed == null) {
                continue;
            }
            for (int index : rows) {
                Entry entry = entries.get(index);
                if (SOURCE_DISPOSITIONS.contains(entry.status())
                        && !key(firstConfirmed.source()).equals(key(entry.source()))) {
                    errors.add(row(entry) + ": 처분한 소스 컬럼을 확정 행(" + firstConfirmed.id()
                            + ")이 옮깁니다(원장 표 표기가 다른 행)");
                }
            }
        }
    }

    private static <T> List<T> nonNullList(List<T> values) {
        return values == null ? List.of() : values;
    }

    private static String row(Entry entry) {
        return entry.id() + (complete(entry.source()) ? " " + label(entry.source()) : "") + "(" + entry.status() + ")";
    }

    /** 조회 경로 없이 mapping 이 직접 옮기는 확정 행(ADR-0029 L3c 부터 기본이 아닌 매핑 포함). */
    private static boolean directConfirmed(Entry entry) {
        return "CONFIRMED".equals(entry.status()) && entry.via() == null;
    }

    /** 이 매핑 id 가 이 별칭으로 조회해 옮기는 확정 행(ADR-0029 L3d). */
    private static boolean viaConfirmed(Entry entry, String mappingId, String alias) {
        return "CONFIRMED".equals(entry.status()) && entry.via() != null
                && mappingId.equals(entry.via().mapping()) && alias.equals(entry.via().lookup());
    }

    /** 원장 행의 실효 매핑 id. 생략하면 그 소스의 기본 매핑이다. */
    private static String effectiveMapping(Entry entry) {
        return entry.mapping() == null ? MappingSpec.TableMapping.DEFAULT_ID : entry.mapping();
    }

    private static String mappingLabel(Entry entry) {
        return entry.mapping() == null ? "기본 매핑" : entry.mapping();
    }

    /**
     * 확정 행이 쓰는 codemap 을 mapping 의 정의와 live 허용값으로 본다. codemap 이 mapping 에 있어야 하고, 기록된 위반
     * (허용값 밖 코드·형식 밖 값)이나 확인하지 못한 허용값을 codemap 으로 처리하면 {@code unmapped: fail} 이어야 한다. 허용값을
     * 읽을 수 있으면 codemap 이 내는 표준 코드(값과 쓰이는 fallback)가 그 안에 있어야 한다(DEC-OPS-317 U3). 코드값은
     * 싣지 않는다.
     */
    public List<String> codemaps(TermLedger ledger, Map<String, CodeMap> codemaps, Map<TermKey, StandardTermRecord> terms) {
        return codemaps(ledger, codemaps, terms, DEFAULT_SCHEMA);
    }

    /** {@code defaultSchema} 는 schema 를 밝히지 않은 대상 표의 schema 다(대상 연결의 현재 schema). */
    public List<String> codemaps(TermLedger ledger, Map<String, CodeMap> codemaps, Map<TermKey, StandardTermRecord> terms,
                                 String defaultSchema) {
        Objects.requireNonNull(codemaps, "codemaps");
        Objects.requireNonNull(terms, "terms");
        List<String> errors = new ArrayList<>();
        for (Entry entry : ledger.entries()) {
            if (!"CONFIRMED".equals(entry.status()) || entry.load() == null || entry.load().codemap() == null) {
                continue;
            }
            String id = entry.id();
            String name = entry.load().codemap();
            CodeMap codemap = codemaps.get(name);
            if (codemap == null) {
                errors.add(id + ": load.codemap 이 mapping 의 codemaps 에 없습니다");
                continue;
            }
            if (reliesOnCodemap(entry) && codemap.unmapped() != UnmappedPolicy.FAIL) {
                errors.add(id + ": 위반·허용값 확인을 codemap 으로 처리하면 그 codemap 은 unmapped: fail 이어야"
                        + " 합니다");
            }
            if (!complete(entry.term()) || !complete(entry.target())) {
                continue;
            }
            StandardTermRecord record = terms.get(new TermKey(schema(entry.target(), defaultSchema),
                    entry.term().engAbbr()));
            Set<String> allowed = record == null ? Set.of() : LoadCapabilities.allowedCodes(record.allowedValues());
            if (allowed.isEmpty()) {
                continue;
            }
            boolean fallbackUsed = codemap.unmapped() == UnmappedPolicy.FALLBACK
                    || codemap.nullAs() == NullPolicy.FALLBACK;
            if (!allowed.containsAll(codemap.values().values())
                    || (fallbackUsed && !allowed.contains(codemap.fallback()))) {
                errors.add(id + ": codemap 이 내는 표준 코드가 표준 용어 " + entry.term().engAbbr()
                        + " 의 허용값 밖에 있습니다");
            }
        }
        return errors;
    }

    /**
     * 기록된 위반을 codemap 이 처리하는가 — 허용값 밖 코드와, codemap 이 type 보다 먼저 받는 형식 밖 값·달력 밖 날짜다.
     * 확인하지 못한 허용값은 사유(note)가 없을 때만 codemap 에 기댄다(U3).
     */
    private static boolean reliesOnCodemap(Entry entry) {
        Conformance conformance = entry.conformance();
        if (conformance == null) {
            return false;
        }
        return (conformance.unmeasured().contains("ALLOWED_VALUES_UNVERIFIED") && blank(entry.note()))
                || conformance.violations().stream().anyMatch(violation -> violation != null
                && violation.type() != null && CODEMAP_HANDLED.contains(violation.type()));
    }

    /**
     * 확정 행을 live 메타와 대조한다. 표준 용어는 있고 이름·도메인이 같으며 폐기되지 않아야 한다. 비표준 대상은 대상
     * 컬럼 이름과 같은 영문약어의 용어가 그 schema 의 메타에 없어야 한다 — 대상 표준 계약은 컬럼 이름으로 용어를 찾는다.
     * {@code terms} 의 키는 (대상 schema, 대문자 영문약어)다.
     */
    public List<String> live(TermLedger ledger, Map<TermKey, StandardTermRecord> terms) {
        return live(ledger, terms, DEFAULT_SCHEMA);
    }

    /** {@code defaultSchema} 는 schema 를 밝히지 않은 대상 표의 schema 다(대상 연결의 현재 schema). */
    public List<String> live(TermLedger ledger, Map<TermKey, StandardTermRecord> terms, String defaultSchema) {
        List<String> errors = new ArrayList<>();
        for (Entry entry : ledger.entries()) {
            if (!"CONFIRMED".equals(entry.status()) || !complete(entry.target())) {
                continue;
            }
            String schema = schema(entry.target(), defaultSchema);
            if (entry.nonStandardTarget() != null && entry.term() == null) {
                StandardTermRecord record = terms.get(new TermKey(schema, entry.target().column()));
                if (record != null) {
                    errors.add(entry.id() + ": 대상 컬럼 " + entry.target().column() + " 에는 live 메타의 표준 용어가"
                            + " 있어 비표준 대상으로 확정할 수 없습니다");
                }
                continue;
            }
            if (!complete(entry.term())) {
                continue;
            }
            StandardTerm term = entry.term();
            StandardTermRecord record = terms.get(new TermKey(schema, term.engAbbr()));
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

    public Map<String, Set<String>> confirmedTermsBySchema(TermLedger ledger) {
        return confirmedTermsBySchema(ledger, DEFAULT_SCHEMA);
    }

    /**
     * live 대조가 읽어야 할 영문약어를 대상 표의 schema 별로 모은다. schema 를 밝히지 않은 대상 표는
     * {@code defaultSchema}(대상 연결의 현재 schema — 대상 표준 계약과 같은 해석)다. 확정 행의 표준 용어와, 비표준 대상
     * 행의 대상 컬럼 이름(용어가 없음을 증명해야 한다)이다. 영문약어는 대문자다.
     */
    public Map<String, Set<String>> confirmedTermsBySchema(TermLedger ledger, String defaultSchema) {
        Map<String, Set<String>> bySchema = new HashMap<>();
        for (Entry entry : ledger.entries()) {
            if (!"CONFIRMED".equals(entry.status()) || !complete(entry.target())) {
                continue;
            }
            String abbreviation = complete(entry.term()) ? entry.term().engAbbr()
                    : entry.nonStandardTarget() != null && entry.term() == null ? entry.target().column() : null;
            if (abbreviation != null) {
                bySchema.computeIfAbsent(schema(entry.target(), defaultSchema), key -> new HashSet<>())
                        .add(abbreviation.toUpperCase(Locale.ROOT));
            }
        }
        return bySchema;
    }

    /** 대상 표 이름의 schema 부분. 없으면 {@code defaultSchema}(비었으면 public)다. */
    private static String schema(ColumnRef target, String defaultSchema) {
        String table = target.table();
        int dot = table.indexOf('.');
        return dot > 0 ? table.substring(0, dot) : blank(defaultSchema) ? DEFAULT_SCHEMA : defaultSchema;
    }

    private static String key(ColumnRef ref) {
        return ref.table().toLowerCase(Locale.ROOT) + '\u0000' + ref.column().toLowerCase(Locale.ROOT);
    }

    private static String label(ColumnRef ref) {
        return ref.table() + "." + ref.column();
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

    private static <T> List<T> nonNull(List<T> values) {
        return values.stream().filter(Objects::nonNull).toList();
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

    /** live 메타의 표준 용어 키 — 대상 schema 와 대문자 영문약어. */
    public record TermKey(String schema, String engAbbr) {

        public TermKey {
            Objects.requireNonNull(schema, "schema");
            engAbbr = Objects.requireNonNull(engAbbr, "engAbbr").toUpperCase(Locale.ROOT);
        }
    }

    /** live 메타의 표준 용어 한 행. {@code allowedValues} 는 공통표준 허용값 원문이고 없을 수 있다. */
    public record StandardTermRecord(String name, String domain, boolean deprecated, String allowedValues) {

        public StandardTermRecord(String name, String domain, boolean deprecated) {
            this(name, domain, deprecated, null);
        }
    }
}
