package nuri.migration.validate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.domain.DomainViolation;
import nuri.migration.domain.TargetValueGuard;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.isolate.RowIsolationPolicy;
import nuri.migration.lookup.LookupRules;
import nuri.migration.mapping.MappingIndex;
import nuri.migration.mapping.MappingKey;
import nuri.migration.model.MappingSpec;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.protect.ColumnProtectionPlan;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.CodeTranslator;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.transform.TypeConverter;
import nuri.migration.validate.ledger.LoadCapabilities;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 매핑의 TARGET 이 표준 스키마({@code db_columns.json})에 실재하는지 검증(DB 헌법 제2조 강제).
 *
 * <p>{@code db_columns.json} 은 {@code {table_name, column_name}} 배열(코드젠 스냅샷).
 * 부재·파싱 실패·빈 catalog는 타깃 표준을 증명할 수 없으므로 검증 오류다. 경로는
 * {@code migration.db-columns-path}.
 */
@Component
public class MappingValidator {

    private static final Pattern UNSAFE_WHERE = Pattern.compile(
            "(?is)(;|--|/\\*|\\*/|\\b(select|insert|update|delete|merge|drop|alter|create|truncate|call|copy|grant|revoke)\\b)");
    /** 원장 행 ID 형식(용어 매핑 원장과 같다). */
    private static final Pattern LEDGER_ENTRY = Pattern.compile("[A-Za-z0-9_.-]{1,64}");
    /** 보관 선언 id 형식 — 매핑 id 와 같다(ADR-0029 L3e). 덤프 파일 이름에 들어간다. */
    private static final Pattern ARCHIVE_ID = Pattern.compile("[a-z][a-z0-9_]{0,62}");
    private static final String ISOLATABLE_CODES = "INVALID_DATE·PLACEHOLDER_DATE·TIME_PRESENT·FORMAT·BLANK·"
            + "CODEMAP_UNMAPPED·LENGTH_EXCEEDED·PRECISION_EXCEEDED·REQUIRED_MISSING";

    private final TransformerRegistry transformers;
    private final String dbColumnsPath;
    private final ObjectMapper json = new ObjectMapper();

    public MappingValidator(TransformerRegistry transformers,
                            @Value("${migration.db-columns-path:db_columns.json}") String dbColumnsPath) {
        this.transformers = transformers;
        this.dbColumnsPath = dbColumnsPath;
    }

    public ValidationResult validate(MappingSpec spec) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        for (int tableIndex = 0; tableIndex < spec.tables().size(); tableIndex++) {
            MappingSpec.TableMapping table = spec.tables().get(tableIndex);
            if (table == null) {
                errors.add("tables[" + tableIndex + "]: 테이블 매핑 항목은 null일 수 없습니다");
                continue;
            }
            for (int columnIndex = 0; columnIndex < table.columns().size(); columnIndex++) {
                if (table.columns().get(columnIndex) == null) {
                    errors.add("tables[" + tableIndex + "].columns[" + columnIndex
                            + "]: 컬럼 매핑 항목은 null일 수 없습니다");
                }
            }
        }
        if (!errors.isEmpty()) {
            return new ValidationResult(errors, warnings);
        }
        Set<String> targetColumns = loadTargetColumns(errors);
        // [ADR-0029 L3c] 매핑은 (소스, 매핑 id) 로 유일하고, 소스마다 keymap 을 만드는 매핑은 하나다. 부모 소스는 그
        //   소유 매핑으로 푼다 — 실행 순서·실행기와 같은 판정기(MappingIndex)를 쓴다.
        MappingIndex sourceTables = MappingIndex.of(spec.tables());
        errors.addAll(sourceTables.errors());
        // [ADR-0029 L3d] 조회 조인 — 실행기와 같은 규칙(LookupRules)이다.
        errors.addAll(LookupRules.violations(spec.tables()));

        for (MappingSpec.TableMapping t : spec.tables()) {
            validateIdentifier("소스 테이블", t.source(), errors);
            if (isBlank(t.target())) {
                errors.add("타깃 테이블 미지정: source=" + t.source());
                continue;
            }
            validateIdentifier("타깃 테이블", t.target(), errors);
            if (!isBlank(t.orderBy()) && !t.orderByKeys().isEmpty()) {
                errors.add(t.source() + ": orderBy와 orderByKeys를 함께 선언할 수 없습니다");
            }
            if (!isBlank(t.orderBy())) {
                validateColumnIdentifier(t.source() + ": orderBy", t.orderBy(), errors);
            }
            Set<String> distinctOrderKeys = new HashSet<>();
            for (String orderKey : t.orderByKeys()) {
                validateColumnIdentifier(t.source() + ": orderByKeys", orderKey, errors);
                if (!isBlank(orderKey) && !distinctOrderKeys.add(normalize(orderKey))) {
                    errors.add(t.source() + ": orderByKeys 중복 금지: " + orderKey);
                }
            }
            if (!isBlank(t.targetKey())) {
                validateColumnIdentifier(t.target() + ": targetKey", t.targetKey(), errors);
            }
            if (!isBlank(t.where()) && UNSAFE_WHERE.matcher(t.where()).find()) {
                errors.add(t.source() + ": where에는 단일 읽기 조건식만 허용됩니다(주석·세미콜론·SQL 문 금지)");
            }
            for (MappingSpec.Lookup lookup : t.lookups()) {
                if (lookup != null && !isBlank(lookup.where()) && UNSAFE_WHERE.matcher(lookup.where()).find()) {
                    errors.add(MappingIndex.label(t) + ".lookups[" + lookup.alias()
                            + "]: where에는 단일 읽기 조건식만 허용됩니다(주석·세미콜론·SQL 문 금지)");
                }
            }
            MappingSpec.IdStrategy id = t.idStrategy();
            validateIdStrategy(t, id, targetColumns, errors);
            validateTypedIdentity(t, sourceTables, targetColumns, errors);
            Set<String> written = new HashSet<>();
            for (MappingSpec.ColumnMapping c : t.columns()) {
                if (isBlank(c.target())) {
                    errors.add(t.target() + ": 타깃 컬럼 미지정");
                    continue;
                }
                // [ADR-0029 L3a-2] 실행기는 대상 컬럼마다 값 하나만 쓴다 — 두 항목이 같은 컬럼을 채우면 앞 값이 조용히 빠진다.
                if (!written.add(normalize(c.target()))) {
                    errors.add(t.target() + ": 같은 타깃 컬럼을 두 컬럼 항목이 채웁니다: " + c.target());
                }
                if (!targetColumns.isEmpty()) {
                    String key = normalize(t.target() + "." + c.target());
                    if (!targetColumns.contains(key)) {
                        errors.add("표준 스키마에 없는 타깃 컬럼: " + key);
                    }
                }
                if (!isBlank(c.transform()) && !transformers.has(c.transform())) {
                    errors.add(t.target() + "." + c.target() + ": 미등록 변환기 '" + c.transform() + "'");
                }
                if (!isBlank(c.type()) && !TypeConverter.isKnown(c.type())) {
                    errors.add(t.target() + "." + c.target() + ": 미지 타입 '" + c.type() + "'");
                }
                if (!isBlank(c.codemap()) && !spec.codemaps().containsKey(c.codemap())) {
                    errors.add(t.target() + "." + c.target() + ": 정의되지 않은 코드맵 '" + c.codemap() + "'");
                }
                validateDomainLoad(t, c, errors);
                if (!isBlank(c.fkRef())) {
                    validateFkRef(t, c, sourceTables, errors);
                }
                if (isBlank(c.source()) && c.constant() == null && isBlank(c.fkRef())) {
                    errors.add(t.target() + "." + c.target()
                            + ": source·const 모두 없음 — 값이 결정되지 않는 컬럼 매핑은 허용되지 않습니다");
                }
            }
        }
        validateIsolation(spec, errors);
        // [ADR-0029 L4 D2] 대사 선언(verify)의 형식과 P3 — 격리하는 보존 키 표는 참조 선언이나 '참조 없음' 확인이 필요하다.
        errors.addAll(VerifyReferenceRules.violations(spec));
        validateArchives(spec, errors);
        validateCrossTableCycles(spec.tables(), sourceTables, errors);
        // 온라인 앱이 암호화해 저장하는 컬럼은 encrypt 선언이 같아야 한다(DEC-OPS-308). 문구는 테이블·컬럼 이름만 담는다.
        errors.addAll(ColumnProtectionPlan.of(spec).violations());
        validateCodemaps(spec.codemaps(), errors, warnings);
        return new ValidationResult(errors, warnings);
    }

    /**
     * [ADR-0029 L3a-1] 표준 도메인 변환기는 대상 표기를 스스로 정하므로 같은 컬럼의 type·codemap 과 함께 쓸 수 없고,
     * 암호화 컬럼에는 쓸 수 없다(암호화할 평문이 바뀐다). nullify 는 그 컬럼의 load 가 실제로 낼 수 있는 위반
     * ({@code BLANK}·{@code PLACEHOLDER_DATE})에만, 1 이상의 상한과 함께 한 번씩 선언한다 — 실행기도 같은 선언을 다시
     * 확인한다.
     */
    private void validateDomainLoad(MappingSpec.TableMapping table, MappingSpec.ColumnMapping column,
                                    List<String> errors) {
        String location = table.target() + "." + column.target();
        if (transformers.isDomain(column.transform())) {
            String label = location + ": 표준 도메인 변환기 '" + column.transform() + "' 는 ";
            if (!isBlank(column.type())) {
                errors.add(label + "type 과 함께 쓸 수 없습니다 — 변환기가 대상 표기를 정합니다");
            }
            if (!isBlank(column.codemap())) {
                errors.add(label + "codemap 과 함께 쓸 수 없습니다 — 변환기가 대상 표기를 정합니다");
            }
            if (column.encrypt() != null) {
                errors.add(label + "암호화 컬럼에 쓸 수 없습니다 — 암호화할 평문이 바뀝니다");
            }
        }
        Set<DomainViolation> producible = nullifiable(column);
        Set<DomainViolation> declared = EnumSet.noneOf(DomainViolation.class);
        for (MappingSpec.Nullify rule : column.nullify()) {
            if (rule.violation() == null) {
                errors.add(location + ": nullify 항목에는 violation 이 필요합니다");
                continue;
            }
            if (rule.violation() != DomainViolation.BLANK && rule.violation() != DomainViolation.PLACEHOLDER_DATE) {
                errors.add(location + ": nullify 는 BLANK·PLACEHOLDER_DATE 위반에만 선언할 수 있습니다");
            } else if (!producible.contains(rule.violation())) {
                errors.add(location + ": nullify " + rule.violation() + " 는 이 컬럼의 load 가 내지 않는 위반입니다"
                        + " — BLANK 는 표준 도메인 변환기나 비문자 type, PLACEHOLDER_DATE 는 날짜 변환기가 냅니다");
            }
            if (rule.maxRows() == null || rule.maxRows() < 1) {
                errors.add(location + ": nullify maxRows 는 1 이상이어야 합니다");
            }
            if (!declared.add(rule.violation())) {
                errors.add(location + ": nullify 에 같은 위반을 두 번 선언할 수 없습니다");
            }
        }
    }

    /**
     * [ADR-0029 L3b] 승인 행 격리 선언의 정적 전제. 격리 행의 순번이 정해지도록 isolate 가 있는 표는 모드와 무관하게
     * 순서 키(orderBy·orderByKeys)를 둔다 — 순서 없는 dry-run 은 원천 키를 계산할 수 없고 순번이 결정적이지 않다. 격리하면
     * 안 되는 표(target_generated·분할한 소스(ADR-0029 L3c)·자기참조·다른 매핑의 부모)와 컬럼(암호화·fkRef·값을 변환하지 않는
     * 컬럼)에는 둘 수 없다
     * ({@link RowIsolationPolicy}). 선언은 원장 행 ID 형식·1~1000 상한·격리할 수 있는 코드를 한 번씩, 그 컬럼의 nullify 가
     * NULL 로 바꾸지 않는 위반만 담고, 한 원장 행은 한 컬럼만 가리킨다. 문구는 표·컬럼 이름과 원장 행 ID 만 담는다.
     */
    private static void validateIsolation(MappingSpec spec, List<String> errors) {
        for (MappingSpec.TableMapping table : spec.tables()) {
            boolean declared = false;
            Map<String, String> ledgerEntries = new HashMap<>();
            for (MappingSpec.ColumnMapping column : table.columns()) {
                MappingSpec.Isolate isolate = column.isolate();
                if (isolate == null) {
                    continue;
                }
                declared = true;
                String location = table.target() + "." + column.target();
                String blocker = RowIsolationPolicy.columnBlocker(column);
                if (blocker != null) {
                    errors.add(location + ": " + blocker + "에는 isolate 를 둘 수 없습니다");
                }
                validateIsolateShape(location, column, isolate, errors);
                if (isolate.ledgerEntry() != null && LEDGER_ENTRY.matcher(isolate.ledgerEntry()).matches()) {
                    String previous = ledgerEntries.putIfAbsent(isolate.ledgerEntry(), column.target());
                    if (previous != null) {
                        errors.add(location + ": 같은 원장 행(" + isolate.ledgerEntry() + ")을 두 컬럼의 isolate 가"
                                + " 가리킵니다 — " + previous + ", " + column.target());
                    }
                }
            }
            if (!declared) {
                continue;
            }
            if (table.effectiveOrderKeys().isEmpty()) {
                errors.add(MappingIndex.label(table) + ": isolate 가 있는 표에는 orderBy·orderByKeys 가 필요합니다 — 순서 없이 읽으면"
                        + " 격리 행의 순번이 정해지지 않습니다");
            }
            String blocker = RowIsolationPolicy.tableBlocker(spec.tables(), table);
            if (blocker != null) {
                errors.add(MappingIndex.label(table) + ": " + blocker + "에는 isolate 를 둘 수 없습니다");
            }
        }
    }

    /**
     * [ADR-0029 L3e] 외부 보관 선언의 정적 전제. 보관은 COMMIT load 의 같은 읽기 세션 안에서 쓰므로 보관만 있는 mapping 은
     * 받지 않는다(빈 tables 는 검증이 FAIL 로 본다). 선언마다 매핑 id 형식의 유일한 id, 소스 표, 1개 이상의 컬럼과 같은
     * 순서·같은 수의 원장 행 ID, yyyy-MM-dd 보존 기한이 있어야 한다. 매핑된 표(같은 source 표기의 표 매핑이 있음)는 그
     * 매핑의 where·정렬 키를 그대로 쓰므로 따로 선언하면 오류이고, 그 매핑에 정렬 키가 있어야 덤프 행의 키가 정해진다. 덤프만
     * 하는 표는 정렬 키(필수)·where(선택, 단일 읽기 조건식)를 선언하고, 같은 표의 선언끼리 같아야 한다. 한 소스 컬럼은 한
     * 선언에만, 한 원장 행은 한 컬럼에만, (소스 표, 보존 기한) 은 한 선언에만 둔다. 암호화 대상의 소스 컬럼은
     * {@link ColumnProtectionPlan} 이 따로 막는다. 문구는 위치·id·표·컬럼 이름만 담는다.
     */
    private static void validateArchives(MappingSpec spec, List<String> errors) {
        if (spec.archives().isEmpty()) {
            return;
        }
        if (spec.tables().isEmpty()) {
            errors.add("보관(archives)만 있는 mapping 은 실행할 수 없습니다 — 보관은 적재 run 과 같은 읽기 세션에서 씁니다");
        }
        Set<String> ids = new HashSet<>();
        Set<String> retentions = new HashSet<>();
        Map<String, String> dumpedColumns = new HashMap<>();
        Map<String, String> ledgerEntries = new HashMap<>();
        Map<String, MappingSpec.ArchiveDump> dumpOnlyReads = new HashMap<>();
        for (int position = 0; position < spec.archives().size(); position++) {
            MappingSpec.ArchiveDump archive = spec.archives().get(position);
            if (archive == null) {
                errors.add("archives[" + position + "]: 보관 선언 항목은 null일 수 없습니다");
                continue;
            }
            boolean namedId = archive.id() != null && ARCHIVE_ID.matcher(archive.id()).matches();
            String label = "archives[" + position + "]" + (namedId ? "(" + archive.id() + ")" : "");
            if (!namedId) {
                errors.add(label + ": 보관 id 는 소문자로 시작하는 소문자·숫자·밑줄 63자 이내여야 합니다");
            } else if (!ids.add(archive.id())) {
                errors.add(label + ": 같은 보관 id 가 두 번 있습니다");
            }
            if (isBlank(archive.source())) {
                errors.add(label + ": 보관할 소스 표(source)가 필요합니다");
                continue;
            }
            validateIdentifier("보관 소스 테이블", archive.source(), errors);
            String source = normalize(archive.source().trim());
            if (archiveDate(archive.retainUntil()) == null) {
                errors.add(label + ": 보존 기한(retainUntil)은 yyyy-MM-dd 날짜여야 합니다");
            } else if (!retentions.add(source + '\u0000' + archive.retainUntil())) {
                errors.add(label + ": 같은 소스 표·보존 기한의 보관 선언이 둘입니다 — 하나로 묶습니다");
            }
            if (archive.columns().isEmpty()) {
                errors.add(label + ": 보관할 컬럼(columns)이 필요합니다");
            }
            for (String column : archive.columns()) {
                validateColumnIdentifier(label + ": columns", column, errors);
                if (!isBlank(column)) {
                    String previous = dumpedColumns.putIfAbsent(source + '\u0000' + normalize(column.trim()), label);
                    if (previous != null) {
                        errors.add(label + ": 같은 소스 컬럼(" + column + ")을 두 번 보관합니다 — " + previous);
                    }
                }
            }
            if (archive.ledgerEntries().size() != archive.columns().size()) {
                errors.add(label + ": ledgerEntries 는 columns 와 같은 순서·같은 수의 원장 행 ID 여야 합니다");
            }
            for (String entry : archive.ledgerEntries()) {
                if (entry == null || !LEDGER_ENTRY.matcher(entry).matches()) {
                    errors.add(label + ": ledgerEntries 는 원장 행 ID 형식(영문·숫자·_.- 64자 이내)이어야 합니다");
                } else if (ledgerEntries.putIfAbsent(entry, label) != null) {
                    errors.add(label + ": 같은 원장 행(" + entry + ")을 두 보관 컬럼이 가리킵니다");
                }
            }
            MappingSpec.TableMapping mapped = spec.mappedTableOf(archive.source());
            if (mapped != null) {
                if (spec.archiveReaderAmbiguous(archive.source())) {
                    errors.add(label + ": 분할한 소스의 보관은 keymap 소유 매핑이나 id 를 생략한 매핑의 읽기에 붙습니다 — 둘 다 없어"
                            + " 보관 컬럼을 붙일 읽기를 정할 수 없습니다");
                } else if (!spec.archiveReaderCoversSource(archive.source())) {
                    errors.add(label + ": " + MappingSpec.SPLIT_ARCHIVE_WHERE_MISMATCH);
                }
                if (archive.where() != null || !archive.orderByKeys().isEmpty()) {
                    errors.add(label + ": 매핑된 표의 보관은 그 매핑의 where·정렬 키를 그대로 씁니다 — 보관 선언에"
                            + " where·orderByKeys 를 두지 않습니다");
                }
                if (mapped.effectiveOrderKeys().isEmpty()) {
                    errors.add(label + ": 보관하는 매핑된 표에는 orderBy·orderByKeys 가 필요합니다 — 덤프 행의 키를 정할 수"
                            + " 없습니다");
                }
                continue;
            }
            if (archive.orderByKeys().isEmpty()) {
                errors.add(label + ": 덤프만 하는 표의 보관에는 정렬 키(orderByKeys)가 필요합니다");
            }
            Set<String> keys = new HashSet<>();
            for (String key : archive.orderByKeys()) {
                validateColumnIdentifier(label + ": orderByKeys", key, errors);
                if (!isBlank(key) && !keys.add(normalize(key))) {
                    errors.add(label + ": orderByKeys 중복 금지: " + key);
                }
            }
            if (archive.where() != null && (archive.where().isBlank() || UNSAFE_WHERE.matcher(archive.where()).find())) {
                errors.add(label + ": where에는 단일 읽기 조건식만 허용됩니다(주석·세미콜론·SQL 문 금지)");
            }
            MappingSpec.ArchiveDump first = dumpOnlyReads.putIfAbsent(source, archive);
            if (first != null && (!Objects.equals(first.where(), archive.where())
                    || !first.orderByKeys().equals(archive.orderByKeys()))) {
                errors.add(label + ": 같은 덤프만 하는 표의 보관 선언은 where·정렬 키가 같아야 합니다 — 한 번 읽어 나눠 씁니다");
            }
        }
    }

    private static LocalDate archiveDate(String value) {
        if (value == null || !value.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException invalid) {
            return null;
        }
    }

    private static void validateIsolateShape(String location, MappingSpec.ColumnMapping column,
                                             MappingSpec.Isolate isolate, List<String> errors) {
        if (isolate.ledgerEntry() == null || !LEDGER_ENTRY.matcher(isolate.ledgerEntry()).matches()) {
            errors.add(location + ": isolate.ledgerEntry 는 원장 행 ID 형식(영문·숫자·_.- 64자 이내)이어야 합니다");
        }
        if (isolate.maxRows() == null || isolate.maxRows() < 1
                || isolate.maxRows() > LoadCapabilities.MAX_EXCEPTION_ROWS) {
            errors.add(location + ": isolate maxRows 는 1~" + LoadCapabilities.MAX_EXCEPTION_ROWS + " 이어야 합니다");
        }
        if (isolate.violations().isEmpty()) {
            errors.add(location + ": isolate 에는 격리할 위반(violations)이 필요합니다");
        } else if (!LoadCapabilities.ISOLATABLE.containsAll(isolate.violations())
                || Set.copyOf(isolate.violations()).size() != isolate.violations().size()) {
            errors.add(location + ": isolate 의 위반은 격리할 수 있는 코드(" + ISOLATABLE_CODES + ")를 한 번씩 둡니다");
        }
        for (MappingSpec.Nullify rule : column.nullify()) {
            if (rule.violation() != null && isolate.violations().contains(rule.violation().name())) {
                errors.add(location + ": nullify 로 NULL 이 되는 위반(" + rule.violation().name() + ")은 격리하지"
                        + " 않습니다 — 그 행은 실패하지 않습니다");
            }
        }
    }

    /** 이 컬럼의 load 가 nullify 로 넘길 수 있는 위반. const·source 없는 컬럼은 값을 변환하지 않아 없다. */
    private Set<DomainViolation> nullifiable(MappingSpec.ColumnMapping column) {
        Set<DomainViolation> producible = EnumSet.noneOf(DomainViolation.class);
        if (column.constant() == null && !isBlank(column.source())) {
            producible.addAll(transformers.domainViolations(column.transform()));
            if (TypeConverter.isNonTextType(column.type())) {
                producible.add(DomainViolation.BLANK);
            }
        }
        return producible;
    }

    /**
     * [2026-10-13 DEC-OPS-309] 실행기와 같은 판정으로 codemap 정의의 결함을 적재 전에 알린다.
     * 숫자처럼 보이지만 정규형이 아닌 키(1.0·01)는 숫자 열에서 닿지 않으므로 경고한다 — 문자열 열의 정상 코드일 수
     * 있어 오류로 막지 않는다. 경고는 키 값 대신 values 안의 위치만 밝힌다.
     */
    private static void validateCodemaps(Map<String, MappingSpec.CodeMap> codemaps, List<String> errors,
                                         List<String> warnings) {
        for (Map.Entry<String, MappingSpec.CodeMap> entry : codemaps.entrySet()) {
            String problem = CodeTranslator.definitionProblem(entry.getValue());
            if (problem != null) {
                errors.add("codemap '" + entry.getKey() + "': " + problem);
                continue;
            }
            List<Integer> positions = CodeTranslator.nonCanonicalNumericCodes(entry.getValue());
            if (!positions.isEmpty()) {
                warnings.add("codemap '" + entry.getKey() + "': values 의 "
                        + String.join("·", positions.stream().map(String::valueOf).toList())
                        + "번째 코드는 숫자처럼 보이지만 정규형이 아닙니다 — 숫자 원천값은 정규형(1.0·01 → 1)으로"
                        + " 찾으므로 숫자 열에서는 이 코드에 닿지 않습니다. 문자열 열의 코드라면 그대로 두십시오.");
            }
        }
    }

    /**
     * 매핑 사이의 FK 순환을 찾는다. [ADR-0029 L3c] 노드는 매핑 키(소스, 매핑 id)이고 부모는 소스의 keymap 소유 매핑이다
     * — 형제 매핑을 거치는 의존은 소스 단위로는 순환처럼 보여도 매핑 단위로는 DAG 다.
     */
    private static void validateCrossTableCycles(List<MappingSpec.TableMapping> tables,
                                                  MappingIndex sourceTables,
                                                  List<String> errors) {
        Map<String, Set<String>> dependencies = new LinkedHashMap<>();
        for (MappingSpec.TableMapping table : tables) {
            MappingKey self = sourceTables.key(table);
            if (self == null) {
                continue;
            }
            String child = self.label();
            dependencies.putIfAbsent(child, new HashSet<>());
            for (MappingSpec.ColumnMapping column : table.columns()) {
                if (!isBlank(column.fkRef())) {
                    addDependency(sourceTables, column.fkRef(), self, dependencies.get(child));
                }
            }
            for (MappingSpec.CompositeForeignKey foreignKey : table.foreignKeys()) {
                addDependency(sourceTables, foreignKey.parentSource(), self, dependencies.get(child));
            }
        }

        Map<String, Integer> state = new LinkedHashMap<>();
        Deque<String> path = new ArrayDeque<>();
        Set<String> reported = new HashSet<>();
        for (String node : dependencies.keySet()) {
            detectCycle(node, dependencies, state, path, reported, errors);
        }
    }

    private static void addDependency(MappingIndex sourceTables, String parentSource, MappingKey self,
                                      Set<String> dependencies) {
        MappingKey parent = sourceTables.key(sourceTables.parent(parentSource));
        if (parent != null && !parent.equals(self)) {
            dependencies.add(parent.label());
        }
    }

    private static void detectCycle(String node, Map<String, Set<String>> dependencies,
                                    Map<String, Integer> state, Deque<String> path,
                                    Set<String> reported, List<String> errors) {
        int current = state.getOrDefault(node, 0);
        if (current == 2) {
            return;
        }
        if (current == 1) {
            List<String> cycle = new ArrayList<>();
            boolean collect = false;
            for (String item : path) {
                if (item.equals(node)) {
                    collect = true;
                }
                if (collect) {
                    cycle.add(item);
                }
            }
            cycle.add(node);
            String signature = cycle.stream().sorted().distinct().reduce((a, b) -> a + "," + b).orElse(node);
            if (reported.add(signature)) {
                errors.add("교차 테이블 FK 순환 감지 — 결정적 실행 순서가 없음: "
                        + String.join(" -> ", cycle));
            }
            return;
        }
        state.put(node, 1);
        path.addLast(node);
        for (String dependency : dependencies.getOrDefault(node, Set.of())) {
            detectCycle(dependency, dependencies, state, path, reported, errors);
        }
        path.removeLast();
        state.put(node, 2);
    }

    private static void validateIdStrategy(MappingSpec.TableMapping table, MappingSpec.IdStrategy id,
                                           Set<String> targetColumns, List<String> errors) {
        if (id == null) {
            return;
        }
        if (isBlank(id.column())) {
            errors.add(table.target() + ": idStrategy.column 미지정");
        }
        if (isBlank(id.generator())) {
            errors.add(table.target() + ": idStrategy.generator 미지정");
        }
        if (isBlank(id.sourceKey())) {
            errors.add(table.target()
                    + ": idStrategy.sourceKey 미지정 — 레거시 키 매핑 불가(신규 키 미채번, fkRef 번역 불가)");
        }
        if (!isBlank(id.column()) && !targetColumns.isEmpty()) {
            String idKey = normalize(table.target() + "." + id.column());
            if (!targetColumns.contains(idKey)) {
                errors.add("표준 스키마에 없는 idStrategy 타깃 컬럼: " + idKey);
            }
        }
    }

    private static void validateFkRef(MappingSpec.TableMapping child, MappingSpec.ColumnMapping column,
                                      MappingIndex sourceTables,
                                      List<String> errors) {
        String location = child.target() + "." + column.target();
        if (isBlank(column.source())) {
            errors.add(location + ": fkRef에는 번역할 source 컬럼이 필수입니다");
        }
        if (column.constant() != null) {
            errors.add(location + ": fkRef와 const를 함께 선언할 수 없습니다 — FK 번역이 우회됩니다");
        }

        MappingSpec.TableMapping parent = sourceTables.parent(column.fkRef());
        if (parent == null) {
            errors.add(sourceTables.mappingsOf(column.fkRef()).isEmpty()
                    ? location + ": fkRef 부모 소스 테이블 '" + column.fkRef()
                            + "' 이 매핑에 없음 — 모든 자식 행이 고아가 됩니다"
                    : location + ": fkRef 부모 소스 테이블 '" + column.fkRef()
                            + "' 을 나눈 매핑 가운데 keymap 을 만드는 매핑(idStrategy)이 없습니다 — 한 매핑이 키를 만들어야 합니다");
            return;
        }
        if (!isComplete(parent.idStrategy())) {
            errors.add(location + ": fkRef 부모 '" + column.fkRef()
                    + "' 의 idStrategy(column/generator/sourceKey)가 완전하지 않아 FK를 번역할 수 없습니다");
        }
    }

    private static boolean isComplete(MappingSpec.IdStrategy id) {
        return id != null
                && !isBlank(id.column())
                && !isBlank(id.generator())
                && !isBlank(id.sourceKey());
    }

    private static void validateTypedIdentity(
            MappingSpec.TableMapping table,
            MappingIndex sourceTables,
            Set<String> targetColumns,
            List<String> errors
    ) {
        MappingSpec.IdentityStrategy identity = table.identity();
        if (identity == null) {
            if (!table.foreignKeys().isEmpty()) {
                errors.add(table.source() + ": composite foreignKeys에는 typed identity가 필수입니다");
            }
            return;
        }
        if (table.idStrategy() != null) {
            errors.add(table.source() + ": legacy idStrategy와 typed identity를 함께 선언할 수 없습니다");
        }

        validateComponents(table.source(), "sourceComponents", identity.sourceComponents(), errors);
        validateComponents(table.source(), "targetComponents", identity.targetComponents(), errors);
        validateStaticTargetColumns(
                table, "typed identity", identity.targetComponents(), targetColumns, errors);

        if (identity.policy() == TargetIdentityPolicy.PRESERVE) {
            validateTypeContract(
                    table.source(), "PRESERVE identity",
                    identity.sourceComponents(), identity.targetComponents(), errors);
        }
        if (identity.policy() == TargetIdentityPolicy.REMAP) {
            Set<String> producers = new HashSet<>();
            for (MappingSpec.ColumnMapping column : table.columns()) {
                if (!isBlank(column.target())) {
                    producers.add(normalize(column.target()));
                }
            }
            for (MappingSpec.CompositeForeignKey foreignKey : table.foreignKeys()) {
                for (MappingSpec.IdentityComponentSpec component : foreignKey.targetComponents()) {
                    producers.add(normalize(component.column()));
                }
            }
            for (MappingSpec.IdentityComponentSpec component : identity.targetComponents()) {
                if (!producers.contains(normalize(component.column()))) {
                    errors.add(table.source()
                            + ": REMAP target identity component 값 생성 mapping 없음: "
                            + component.column());
                }
            }
        }

        for (MappingSpec.CompositeForeignKey foreignKey : table.foreignKeys()) {
            validateIdentifier(table.source() + ": foreign key parentSource",
                    foreignKey.parentSource(), errors);
            validateComponents(table.source(), "foreignKeys.sourceComponents",
                    foreignKey.sourceComponents(), errors);
            validateComponents(table.source(), "foreignKeys.targetComponents",
                    foreignKey.targetComponents(), errors);
            validateStaticTargetColumns(
                    table, "foreign key", foreignKey.targetComponents(), targetColumns, errors);

            MappingSpec.TableMapping parent = sourceTables.parent(foreignKey.parentSource());
            if (parent == null) {
                errors.add(table.source() + ": composite foreign key parent mapping 없음: "
                        + foreignKey.parentSource());
                continue;
            }
            if (parent.identity() == null) {
                errors.add(table.source() + ": composite foreign key parent typed identity 없음: "
                        + foreignKey.parentSource());
                continue;
            }
            validateTypeContract(
                    table.source(), "composite foreign key source type",
                    parent.identity().sourceComponents(), foreignKey.sourceComponents(), errors);
            validateTypeContract(
                    table.source(), "composite foreign key target type",
                    parent.identity().targetComponents(), foreignKey.targetComponents(), errors);
        }
    }

    private static void validateComponents(
            String table,
            String label,
            List<MappingSpec.IdentityComponentSpec> components,
            List<String> errors
    ) {
        if (components.isEmpty()) {
            errors.add(table + ": " + label + "가 비어 있습니다");
            return;
        }
        Set<String> distinct = new HashSet<>();
        for (MappingSpec.IdentityComponentSpec component : components) {
            validateColumnIdentifier(table + ": " + label, component.column(), errors);
            if (!distinct.add(normalize(component.column()))) {
                errors.add(table + ": " + label + " 중복 금지: " + component.column());
            }
        }
    }

    private static void validateStaticTargetColumns(
            MappingSpec.TableMapping table,
            String label,
            List<MappingSpec.IdentityComponentSpec> components,
            Set<String> targetColumns,
            List<String> errors
    ) {
        if (targetColumns.isEmpty()) {
            return;
        }
        for (MappingSpec.IdentityComponentSpec component : components) {
            String key = normalize(table.target() + "." + component.column());
            if (!targetColumns.contains(key)) {
                errors.add("표준 스키마에 없는 " + label + " 타깃 컬럼: " + key);
            }
        }
    }

    private static void validateTypeContract(
            String table,
            String label,
            List<MappingSpec.IdentityComponentSpec> expected,
            List<MappingSpec.IdentityComponentSpec> actual,
            List<String> errors
    ) {
        if (expected.size() != actual.size()) {
            errors.add(table + ": " + label + " arity 불일치: expected="
                    + expected.size() + ", actual=" + actual.size());
            return;
        }
        for (int i = 0; i < expected.size(); i++) {
            if (expected.get(i).type() != actual.get(i).type()) {
                errors.add(table + ": " + label + " 불일치: "
                        + actual.get(i).column() + " expected="
                        + expected.get(i).type().externalName() + ", actual="
                        + actual.get(i).type().externalName());
            }
        }
    }

    /**
     * 실행 전에 실제 source JDBC metadata를 대조한다. 모든 source table, column 및
     * {@code idStrategy.sourceKey}가 확인된 뒤에만 타깃 쓰기 단계로 진행할 수 있다.
     */
    public ValidationResult validateLiveSource(MappingSpec spec, JdbcTemplate source) {
        return MappingLiveMetadataValidator.validateLiveSource(spec, source);
    }

    /**
     * plan·load 에서 live 대상 컬럼 계약과 표준 사전으로 매핑을 대조한다(DEC-OPS-307). 계약은 승인 workflow 가
     * target schema digest 에 결속한 {@link TargetSchemaFingerprint#standard()} 이며, 없으면 실패한다.
     */
    public ValidationResult validateTargetStandard(MappingSpec spec, TargetSchemaFingerprint target,
                                                   CatalogSnapshot inventory) {
        ValidationResult standard = new TargetStandardValidator(transformers::isBuiltin).validate(spec, target, inventory);
        // [ADR-0029 L4 D2] 대사 선언의 자식·부모 컬럼이 승인 fingerprint 에 있고 짝의 타입 계열이 같은지도 본다.
        List<String> references = VerifyReferenceRules.liveViolations(spec, target);
        if (references.isEmpty()) {
            return standard;
        }
        List<String> errors = new ArrayList<>(standard.errors());
        errors.addAll(references);
        return new ValidationResult(errors, standard.warnings());
    }

    /**
     * [ADR-0029 L3b] load 가 실행기에 넘기는 값 한계 가드 — 매핑마다(키: 매핑 라벨 — 기본 매핑은 소스 표 이름, 나눈 매핑은
     * {@code source#id}, ADR-0029 L3c) isolate 컬럼과 정적 정밀도 판정을 행 단위로 옮긴 컬럼의 한계다.
     * {@link #validateTargetStandard} 가 통과한 같은 live 계약으로만 부른다. 가드를 받는 컬럼이 없는 매핑은 싣지 않는다.
     */
    public Map<String, Map<String, TargetValueGuard.Limit>> rowGuards(MappingSpec spec, TargetSchemaFingerprint target,
                                                                       CatalogSnapshot inventory) {
        TargetStandardValidator standard = new TargetStandardValidator(transformers::isBuiltin);
        Map<String, Map<String, TargetValueGuard.Limit>> guards = new LinkedHashMap<>();
        for (MappingSpec.TableMapping table : spec.tables()) {
            Map<String, TargetValueGuard.Limit> limits = standard.rowGuards(spec, table, target, inventory);
            if (!limits.isEmpty()) {
                guards.put(MappingIndex.label(table), limits);
            }
        }
        return guards;
    }

    /**
     * commit 직전 실제 target JDBC metadata를 대조한다. 정적 표준 snapshot과 별개로,
     * 현재 접속 대상에 매핑 table/column이 모두 존재하지 않으면 쓰기를 시작하지 않는다.
     */
    public ValidationResult validateLiveTarget(MappingSpec spec, JdbcTemplate target) {
        return MappingLiveMetadataValidator.validateLiveTarget(spec, target);
    }

    private Set<String> loadTargetColumns(List<String> errors) {
        Set<String> set = new HashSet<>();
        Path path = Path.of(dbColumnsPath);
        if (!Files.exists(path)) {
            errors.add("db_columns.json 부재(" + path + ") — 타깃 표준 검증을 수행할 수 없음");
            return set;
        }
        try {
            JsonNode root = json.readTree(Files.readAllBytes(path));
            if (root == null || !root.isArray()) {
                errors.add("db_columns.json 루트는 배열이어야 합니다: " + path);
                return set;
            }
            for (JsonNode n : root) {
                String table = text(n, "table_name");
                String col = text(n, "column_name");
                if (table != null && col != null) {
                    set.add(normalize(table + "." + col));
                }
            }
            if (set.isEmpty()) {
                errors.add("db_columns.json에 유효한 table_name/column_name 항목이 없습니다: " + path);
            }
        } catch (IOException e) {
            errors.add("db_columns.json 파싱 실패 — 타깃 표준 검증 불가: " + e.getMessage());
        }
        return set;
    }

    private static void validateIdentifier(String label, String identifier, List<String> errors) {
        try {
            SourceIntrospector.qualifiedIdent(identifier);
        } catch (IllegalArgumentException e) {
            errors.add(label + " 식별자 오류: " + e.getMessage());
        }
    }

    private static void validateColumnIdentifier(String label, String identifier, List<String> errors) {
        try {
            SourceIntrospector.ident(identifier);
        } catch (IllegalArgumentException e) {
            errors.add(label + " 식별자 오류: " + e.getMessage());
        }
    }

    private static String text(JsonNode n, String field) {
        JsonNode v = n.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT);
    }
}
