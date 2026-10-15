package nuri.migration.validate;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.domain.DomainCategory;
import nuri.migration.domain.TargetValueGuard;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.keymap.StandardIdGenerator;
import nuri.migration.lookup.LookupRef;
import nuri.migration.mapping.MappingIndex;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.NullPolicy;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.model.MappingSpec.UnmappedPolicy;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.postgres.TargetStandardSnapshot;
import nuri.migration.postgres.TargetStandardSnapshot.ColumnContract;
import nuri.migration.postgres.TargetStandardSnapshot.ContractStatus;
import nuri.migration.postgres.TargetStandardSnapshot.StandardStatus;
import nuri.migration.postgres.TargetStandardSnapshot.StandardTerm;
import nuri.migration.postgres.TargetStandardSnapshot.TableContract;
import nuri.migration.postgres.TargetStandardSnapshot.TermStatus;
import nuri.migration.validate.TargetValueDomain.Family;
import nuri.migration.workflow.SourceLoadSurfaceGate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Predicate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 표준화 적재가 대상 표준을 조용히 깨지 않는지 live 대상 계약으로 검증한다(DEC-OPS-307).
 *
 * <ul>
 *   <li>타깃 컬럼의 live 타입·길이·정밀도와 매핑이 만드는 값의 타입·선언 길이를 대조한다.</li>
 *   <li>표준 사전(meta_standard_terms·meta_standard_domains)이 있으면 용어의 도메인도 함께 대조하고,
 *       물리 컬럼과 도메인 중 더 좁은 쪽을 적용한다.</li>
 *   <li>기본값 없는 NOT NULL 컬럼은 매핑·const·ID 전략이 반드시 채워야 한다.</li>
 *   <li>live 계약을 읽지 못하면 실패한다. 코드젠 스냅샷으로 대신하지 않는다.</li>
 *   <li>[ADR-0029 L3a-1] 표준 도메인 변환기는 받을 수 있는 소스 값 종류만 받는다. 시간대가 있는 소스(MySQL·MariaDB
 *       TIMESTAMP 포함)는 변환하지도, 시간대 없는 컬럼에 그대로 옮기지도 않는다. 날짜 값은 timestamp 컬럼에 쓰지
 *       않는다(timestamp-from-date 로 밝힌다). nullify 는 NULL 을 받는 컬럼에만, 여부 도메인의 codemap 은 Y·N 만,
 *       Boolean 소스의 codemap 키는 그 표기(true·false, upper 뒤 TRUE·FALSE)만 받는다.</li>
 *   <li>[ADR-0029 L3a-2] 날짜·시각이 아닌 소스는 type(date·timestamp·datetime)·내장 date·timestamp 로 날짜·시각
 *       값으로 바꾸지 않는다. 값마다 판정하는 표준 도메인 변환기(date-text 등)만 받는다.</li>
 *   <li>[ADR-0029 L3b] 문자 소스를 type decimal·numeric 으로 바꾸는 컬럼은 선언 정밀도를 알 수 없어도 정적으로 막지
 *       않고 행마다 값 한계 가드({@link TargetValueGuard})로 판정한다({@link #rowGuards}). isolate 를 선언한 컬럼도
 *       같은 가드를 받는다. 그 밖의 정밀도·길이 판정은 그대로 정적이다.</li>
 *   <li>[DEC-OPS-322] 원장이 LENGTH_EXCEEDED·PRECISION_EXCEEDED 를 승인한 isolate 컬럼은 그 코드의 선언 길이·정밀도
 *       정적 판정을 값 한계 가드로 옮긴다 — 소스 선언이 대상보다 길거나 모르는 컬럼도 상한 안의 행을 격리하고, 넘으면
 *       멈춘다. 가드가 길이를 재지 않는 값 종류(날짜·UUID 등)와 그 코드를 승인하지 않은 컬럼은 그대로 정적이다.</li>
 * </ul>
 *
 * <p>메시지는 표·컬럼 이름과 타입·길이만 말한다. 상수·코드맵 값과 행 값은 싣지 않는다.
 */
public final class TargetStandardValidator {

    private static final Pattern DOMAIN_SCALE = Pattern.compile("(\\d+),(\\d+)$");
    /** 날짜·시각 컬럼 — 비시간 소스를 type·내장 date·timestamp 로 옮기지 않는다(ADR-0029 L3a-2). */
    private static final Set<Family> TEMPORAL = java.util.EnumSet.of(Family.DATE, Family.TIMESTAMP, Family.TIMESTAMPTZ);
    /** 원천 Boolean 의 codemap 대조 키({@code CodeTranslator} 는 Boolean 을 toString 으로 찾는다). */
    private static final Set<String> BOOLEAN_CODES = Set.of("true", "false");
    /** 내장 {@code upper} 를 거친 원천 Boolean 의 codemap 대조 키. */
    private static final Set<String> UPPER_BOOLEAN_CODES = Set.of("TRUE", "FALSE");
    /**
     * 시간대가 있는 소스 값을 옮기는 길 — 시간대 있는 컬럼뿐이다. 원장 load 는 내장 변환기만 받아(ADR-0029 L3a-2, DEC-OPS-317)
     * 시간대를 정하는 프로젝트 변환기는 승인 workflow 에서 쓸 수 없고, 그 일을 하는 내장 변환기는 아직 없다.
     */
    private static final String ZONED_ESCAPE = "그대로 시간대 있는 컬럼(timestamptz·timetz)에 옮기세요(시간대를 정하는"
            + " 내장 변환기는 아직 없습니다)";

    private final Predicate<String> builtinTransformer;

    public TargetStandardValidator(Predicate<String> builtinTransformer) {
        this.builtinTransformer = Objects.requireNonNull(builtinTransformer, "builtinTransformer");
    }

    public ValidationResult validate(MappingSpec spec, TargetSchemaFingerprint target, CatalogSnapshot inventory) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        TargetStandardSnapshot snapshot = target == null ? null : target.standard();
        if (snapshot == null || inventory == null) {
            errors.add("타깃 live 컬럼 계약 또는 소스 inventory 가 없어 표준 검증을 할 수 없습니다"
                    + " — 코드젠 스냅샷으로 대신하지 않습니다");
            return new ValidationResult(errors, warnings);
        }
        for (TableMapping table : spec.tables()) {
            validateTable(spec, table, snapshot, inventory, errors, warnings);
        }
        return new ValidationResult(errors, warnings);
    }

    private void validateTable(MappingSpec spec, TableMapping table, TargetStandardSnapshot snapshot,
                               CatalogSnapshot inventory, List<String> errors, List<String> warnings) {
        String[] parts = table.target() == null ? new String[0] : table.target().split("\\.", -1);
        if (parts.length != 2) {
            errors.add("타깃 표는 schema.table 로 한정해야 표준 검증을 할 수 있습니다: " + table.target());
            return;
        }
        TableContract contract = snapshot.table(parts[0], parts[1]);
        if (contract == null) {
            errors.add("live 컬럼 계약이 없는 타깃 표: " + table.target());
            return;
        }
        switch (contract.contract()) {
            case UNREADABLE -> {
                errors.add("타깃 표의 컬럼 계약을 information_schema 에서 읽지 못했습니다: " + table.target());
                return;
            }
            case INCOMPLETE -> {
                errors.add("타깃 표의 information_schema 컬럼 집합이 JDBC metadata 와 다릅니다"
                        + "(권한으로 가려진 컬럼 등): " + table.target());
                return;
            }
            case READ -> {
                // 계속 검증한다.
            }
        }
        if (contract.standard() == StandardStatus.INCOMPLETE) {
            errors.add("표준 사전이 불완전합니다(meta_standard_terms·meta_standard_domains 중 하나만 있음): "
                    + contract.schema());
        } else if (contract.standard() == StandardStatus.UNREADABLE) {
            errors.add("표준 사전을 읽지 못했습니다(권한·필수 컬럼 확인): " + contract.schema());
        }

        Set<String> covered = new LinkedHashSet<>();
        EtlExecutor.insertTargetColumns(table).forEach(column -> covered.add(normalize(column)));
        for (ColumnContract column : contract.columns()) {
            if (!column.nullable() && !column.databaseFilled() && !covered.contains(normalize(column.name()))) {
                errors.add("기본값 없는 NOT NULL 타깃 컬럼을 채우는 매핑·const 가 없습니다: "
                        + location(table, column.name()));
            }
        }
        for (String name : covered) {
            ColumnContract column = contract.column(name);
            if (column == null) {
                errors.add("live 타깃에 없는 컬럼: " + location(table, name));
            } else if (column.generated()) {
                errors.add("생성 컬럼(GENERATED ALWAYS AS)에는 값을 쓸 수 없습니다: " + location(table, name));
            } else if ("ALWAYS".equalsIgnoreCase(column.identityGeneration())) {
                errors.add("GENERATED ALWAYS identity 컬럼에는 값을 쓸 수 없습니다: " + location(table, name));
            }
        }
        if (table.idStrategy() != null && table.idStrategy().column() != null) {
            ColumnContract idColumn = contract.column(table.idStrategy().column());
            Long idLength = generatedIdLength(table);
            if (idColumn != null && TargetLimit.physical(idColumn).family() != Family.TEXT) {
                errors.add("idStrategy 가 만드는 표준 ID 는 문자열이라 문자 컬럼이어야 합니다: "
                        + location(table, idColumn.name()));
            } else if (idColumn != null && idLength != null) {
                checkGeneratedId(table, idColumn, idLength, contract.standard() == StandardStatus.PRESENT, errors);
            }
            String prefix = table.idStrategy().generator();
            if (prefix != null && StandardIdGenerator.hexLength(prefix) < StandardIdGenerator.MIN_HEX_LENGTH) {
                errors.add("idStrategy 접두사가 길어 표준 ID 의 무작위 자릿수가 "
                        + StandardIdGenerator.hexLength(prefix) + "자뿐입니다 — 온라인 앱의 최소 "
                        + StandardIdGenerator.MIN_HEX_LENGTH + "자보다 짧아 충돌 위험이 큽니다: "
                        + location(table, table.idStrategy().column()));
            }
        }
        for (ColumnMapping mapping : table.columns()) {
            ColumnContract column = mapping.target() == null ? null : contract.column(mapping.target());
            if (column == null) {
                continue;
            }
            validateColumn(spec, table, mapping, column, contract.standard() == StandardStatus.PRESENT,
                    inventory, errors, warnings);
        }
    }

    private void validateColumn(MappingSpec spec, TableMapping table, ColumnMapping mapping, ColumnContract column,
                                boolean standardPresent, CatalogSnapshot inventory,
                                List<String> errors, List<String> warnings) {
        String location = location(table, column.name());
        String sourceLocation = location + " ← " + table.source() + "." + mapping.source();
        if (!mapping.nullify().isEmpty() && !column.nullable()) {
            // INSERT 는 매핑한 컬럼을 모두 바인딩하므로 NULL 도 명시해 쓴다 — DEFAULT 는 적용되지 않는다.
            errors.add("nullify 는 NULL 을 받는 타깃 컬럼에만 선언할 수 있습니다 — 매핑한 컬럼은 NULL 을 명시해 쓰므로"
                    + " 기본값이 있어도 NOT NULL 이 거부합니다: " + location);
        }
        CatalogObject source = sourceColumn(table, mapping, inventory);
        String sourceProduct = inventory.database().productName();
        TargetValueDomain value = TargetValueDomain.of(mapping, spec.codemaps(), builtinTransformer, source,
                sourceProduct);
        if (value.exempt()) {
            return;
        }
        if (TargetValueDomain.zoneAware(source, sourceProduct) && convertsSourceValue(mapping)) {
            errors.add("시간대가 있는 소스 값은 변환하면 실행 환경의 시간대에 따라 다른 날짜·시각이 됩니다 — " + ZONED_ESCAPE
                    + ": " + sourceLocation);
            return;
        }
        Set<Family> domainInputs = builtinTransformer.test(mapping.transform())
                ? TargetValueDomain.domainInputs(mapping.transform()) : null;
        Family sourceFamily = TargetValueDomain.fromSource(source, sourceProduct).family();
        if (value.family() == Family.UNKNOWN || (domainInputs != null && sourceFamily == Family.UNKNOWN)) {
            errors.add("소스 컬럼의 타입을 승인 inventory 에서 확인할 수 없습니다(없음·모호·미지원): " + sourceLocation);
            return;
        }
        if (domainInputs != null && !domainInputs.contains(sourceFamily)) {
            errors.add("표준 도메인 변환기 '" + mapping.transform() + "' 는 " + sourceFamily
                    + " 소스 값을 받지 않습니다 — 모든 행이 거부됩니다: " + sourceLocation);
            return;
        }
        CodeMap codemap = isBlank(mapping.codemap()) ? null : spec.codemaps().get(mapping.codemap());
        if (codemap != null && sourceFamily == Family.BOOLEAN) {
            checkBooleanCodemap(mapping, codemap, sourceLocation, errors);
        }
        if (mapping.encrypt() != null) {
            // [DEC-OPS-308] 숫자·날짜를 문자열로 바꾸면 앞자리 0·표기가 달라져 다른 값이 암호화된다. 내장 변환기는
            //   toString 으로 바꾸므로 정규화가 아니다 — 정규화는 내장이 아닌 변환기로 선언한다(그때는 위에서 exempt).
            if (value.family() != Family.TEXT || sourceFamily != Family.TEXT) {
                errors.add("암호화 컬럼은 문자열 소스 값만 암호화합니다 — 숫자·날짜는 앞자리 0·표기가 바뀌므로"
                        + " 정규화하는 변환기를 선언하세요: " + location + " ← " + table.source() + "." + mapping.source());
                return;
            }
            value = value.encrypted();
        }
        if (value.generatedKey() && value.maxChars() == null) {
            Long parentIdLength = parentIdLength(spec, mapping.fkRef());
            if (parentIdLength != null) {
                value = TargetValueDomain.generatedKey(parentIdLength);
            }
        }
        TargetLimit physical = TargetLimit.physical(column);
        // [ADR-0029 L3b] 문자 소스 → decimal·numeric 의 정밀도는 행마다 값 한계 가드가 판정한다(rowGuards).
        // [DEC-OPS-322] 원장이 LENGTH_EXCEEDED·PRECISION_EXCEEDED 를 승인한 isolate 컬럼은 선언 길이·정밀도 판정을 통째로
        //   값 한계 가드로 옮긴다 — 상한 안의 행만 격리하고 넘으면 멈춘다(fail-closed). 승인하지 않은 컬럼은 그대로 정적이다.
        RowJudged rowJudged = new RowJudged(rowJudgedPrecision(spec, mapping, source, sourceProduct),
                lengthToRowGuard(mapping, value), precisionToRowGuard(mapping, value));
        int before = errors.size();
        check(value, physical, location, "물리 컬럼 " + column.dataType(), rowJudged, errors);
        if (errors.size() == before && looseTemporal(mapping) && TEMPORAL.contains(physical.family())
                && sourceFamily != Family.DATE && sourceFamily != Family.TIMESTAMP) {
            // [ADR-0029 L3a-2] type·내장 date·timestamp 는 자리표시(99991231 등)를 날짜로 받고 형식 밖 값을 행마다
            //   판정하지 않는다. 원장에 기록된 위반이 낡았거나 비어 있어도 막도록 구조로 거부한다.
            errors.add("날짜·시각이 아닌 소스 값은 type(date·timestamp·datetime)이나 내장 date·timestamp 로 날짜·시각"
                    + " 컬럼에 옮기지 않습니다 — 값마다 판정하는 date-text·timestamp-text·timestamp-from-date·"
                    + "date-truncate 를 쓰세요: " + sourceLocation);
            return;
        }
        if (!standardPresent) {
            return;
        }
        StandardTerm term = column.term();
        if (term == null) {
            warnings.add("표준 용어가 없는 타깃 컬럼(도메인 대조 생략): " + location);
            return;
        }
        if (term.status() != TermStatus.FOUND) {
            errors.add("표준 용어의 도메인을 확정할 수 없습니다(" + term.status() + "): " + location);
            return;
        }
        if (codemap != null && yesNoDomain(term)) {
            checkYesNoCodemap(mapping.codemap(), codemap, location, errors);
        }
        TargetLimit domain = standardLimit(term);
        if (domain == null) {
            errors.add("표준 도메인을 해석할 수 없습니다(" + term.domainName() + "): " + location);
            return;
        }
        if (!domain.sameKind(physical)) {
            errors.add("물리 타입이 표준 도메인과 다릅니다: " + location + " — 물리 " + column.dataType()
                    + ", 표준 도메인 " + term.domainName());
            return;
        }
        if (domain.family() == Family.TEXT || domain.isExactNumeric()) {
            // 날짜·시각 도메인은 길이가 없다 — 종류 일치(sameKind)로 충분하다.
            check(value, domain, location, "표준 도메인 " + term.domainName(), rowJudged, errors);
        }
    }

    /**
     * [ADR-0029 L3b] 행마다 값 한계 가드({@link TargetValueGuard})를 받는 컬럼과 그 한계. isolate 를 선언한 컬럼과, 정적
     * 정밀도 판정을 행 단위로 옮긴 컬럼(문자 소스 → type decimal·numeric)이다 — 옮긴 컬럼은 격리 선언과 무관하게 늘
     * 가드를 받는다(target_generated 매핑 포함). 한계는 validate 와 같은 live 계약으로 정한 물리 컬럼과 표준 도메인 중 좁은
     * 쪽이고, NOT NULL 은 기본값 여부와 무관하다(INSERT 가 NULL 도 명시해 바인딩한다). 키는 mapping 의 대상 컬럼 이름이다.
     * 계약을 읽지 못하면(validate 가 먼저 막는다) 판정할 수 없어 거부한다. 문구는 표·컬럼 이름만 담는다.
     */
    public Map<String, TargetValueGuard.Limit> rowGuards(MappingSpec spec, TableMapping table,
                                                         TargetSchemaFingerprint target, CatalogSnapshot inventory) {
        Objects.requireNonNull(spec, "spec");
        Objects.requireNonNull(table, "table");
        TargetStandardSnapshot snapshot = target == null ? null : target.standard();
        if (snapshot == null || inventory == null) {
            throw new IllegalStateException("값 한계 가드에 쓸 타깃 live 계약 또는 소스 inventory 가 없습니다");
        }
        String[] parts = table.target() == null ? new String[0] : table.target().split("\\.", -1);
        TableContract contract = parts.length == 2 ? snapshot.table(parts[0], parts[1]) : null;
        if (contract == null || contract.contract() != ContractStatus.READ) {
            throw new IllegalStateException("값 한계 가드에 쓸 타깃 표 계약이 없습니다: " + table.target());
        }
        boolean standardPresent = contract.standard() == StandardStatus.PRESENT;
        String sourceProduct = inventory.database().productName();
        Map<String, TargetValueGuard.Limit> guards = new LinkedHashMap<>();
        for (ColumnMapping mapping : table.columns()) {
            if (mapping == null || mapping.target() == null) {
                continue;
            }
            if (mapping.isolate() == null
                    && !rowJudgedPrecision(spec, mapping, sourceColumn(table, mapping, inventory), sourceProduct)) {
                continue;
            }
            ColumnContract column = contract.column(mapping.target());
            if (column == null) {
                throw new IllegalStateException("값 한계 가드에 쓸 타깃 컬럼 계약이 없습니다: "
                        + location(table, mapping.target()));
            }
            guards.put(mapping.target(), guardLimit(column, standardPresent));
        }
        return guards;
    }

    /**
     * 정적 정밀도 판정을 행 단위로 옮기는 컬럼인가 — 문자 소스의 문자 값을 type decimal·numeric 으로 바꾼다. 값마다
     * 자릿수가 달라 선언으로는 정밀도를 알 수 없다. const·fkRef·암호화 컬럼과 사용자 변환기는 해당하지 않는다.
     */
    private boolean rowJudgedPrecision(MappingSpec spec, ColumnMapping mapping, CatalogObject source,
                                       String sourceProduct) {
        if (mapping.constant() != null || !isBlank(mapping.fkRef()) || isBlank(mapping.source())
                || mapping.encrypt() != null) {
            return false;
        }
        String type = isBlank(mapping.type()) ? "" : mapping.type().trim().toLowerCase(Locale.ROOT);
        if (!type.equals("decimal") && !type.equals("numeric")) {
            return false;
        }
        if (TargetValueDomain.fromSource(source, sourceProduct).family() != Family.TEXT) {
            return false;
        }
        ColumnMapping untyped = new ColumnMapping(mapping.source(), mapping.target(), mapping.transform(), null,
                mapping.codemap(), mapping.fkRef(), mapping.constant(), mapping.encrypt(), mapping.nullify(),
                mapping.isolate());
        TargetValueDomain prior = TargetValueDomain.of(untyped, spec.codemaps(), builtinTransformer, source,
                sourceProduct);
        return !prior.exempt() && prior.family() == Family.TEXT;
    }

    /** 물리 컬럼과, 사전이 있고 같은 종류면 표준 도메인을 합친 가드 한계 — 둘 중 좁은 쪽이다. */
    private static TargetValueGuard.Limit guardLimit(ColumnContract column, boolean standardPresent) {
        TargetLimit physical = TargetLimit.physical(column);
        List<TargetLimit> limits = new ArrayList<>(List.of(physical));
        StandardTerm term = column.term();
        if (standardPresent && term != null && term.status() == TermStatus.FOUND) {
            TargetLimit domain = standardLimit(term);
            if (domain != null && domain.sameKind(physical)) {
                limits.add(domain);
            }
        }
        Long maxChars = null;
        Integer intDigits = null;
        Integer scale = null;
        Integer rank = null;
        for (TargetLimit limit : limits) {
            switch (limit.family()) {
                case TEXT -> maxChars = narrower(maxChars, limit.maxChars());
                case INTEGER -> rank = narrower(rank, limit.integerRank());
                case DECIMAL -> {
                    intDigits = narrower(intDigits, limit.intDigits());
                    scale = narrower(scale, limit.scale());
                }
                default -> {
                    // 길이·정밀도가 없는 종류 — NOT NULL 만 본다.
                }
            }
        }
        return new TargetValueGuard.Limit(maxChars, intDigits, scale, rank, !column.nullable());
    }

    private static <T extends Comparable<T>> T narrower(T current, T candidate) {
        if (current == null) {
            return candidate;
        }
        return candidate == null || current.compareTo(candidate) <= 0 ? current : candidate;
    }

    /**
     * 소스 값을 바꾸는가 — 내장 변환기(표준 도메인 변환기 포함)·type·codemap. 시간대가 있는 소스는 이 경로에서 실행
     * 환경의 시간대로 날짜·시각이 정해진다. 사용자 변환기는 출력 계약을 스스로 지므로 여기 오지 않는다(exempt).
     */
    private boolean convertsSourceValue(ColumnMapping mapping) {
        return builtinTransformer.test(mapping.transform()) || !isBlank(mapping.type()) || !isBlank(mapping.codemap());
    }

    /**
     * 값을 행마다 판정하지 않고 날짜·시각으로 바꾸는가 — {@code type: date|timestamp|datetime} 과 내장 {@code date}·
     * {@code timestamp}. 날짜·시각 소스를 그대로 옮기는 데만 쓴다(ADR-0029 L3a-2).
     */
    private boolean looseTemporal(ColumnMapping mapping) {
        String type = isBlank(mapping.type()) ? "" : mapping.type().trim().toLowerCase(java.util.Locale.ROOT);
        return Set.of("date", "timestamp", "datetime").contains(type)
                || (builtinTransformer.test(mapping.transform())
                && Set.of("date", "timestamp").contains(mapping.transform()));
    }

    /**
     * 원천 Boolean 의 codemap 키. Boolean 은 toString 표기로 찾는다 — 변환 없이·{@code trim}·{@code lower} 뒤에는
     * true·false, {@code upper} 뒤에는 TRUE·FALSE 다. 다른 키는 닿지 않아 모든 행이 미매핑이 되거나 대체값이 된다. 그 밖의
     * 내장 변환기 뒤에는 키를 정할 수 없어 받지 않는다. 사용자 변환기는 여기 오지 않는다(exempt). 코드값은 싣지 않는다.
     */
    private static void checkBooleanCodemap(ColumnMapping mapping, CodeMap codemap, String sourceLocation,
                                            List<String> errors) {
        String transform = mapping.transform();
        boolean upper = "upper".equals(transform);
        if (!upper && !isBlank(transform) && !"trim".equals(transform) && !"lower".equals(transform)) {
            errors.add("Boolean 소스에는 내장 변환기 '" + transform + "' 뒤에 codemap 을 쓸 수 없습니다 — 변환한 값이"
                    + " codemap 키에 닿지 않습니다(codemap '" + mapping.codemap() + "'): " + sourceLocation);
            return;
        }
        if (!codemap.values().keySet().equals(upper ? UPPER_BOOLEAN_CODES : BOOLEAN_CODES)) {
            errors.add("Boolean 소스의 codemap 키는 " + (upper ? "TRUE·FALSE(upper 뒤)" : "true·false")
                    + " 두 개여야 합니다(codemap '" + mapping.codemap() + "'): " + sourceLocation);
        }
    }

    /** 여부 도메인인가. 범주 판정은 적합성 추정기·원장 도메인 가드와 같은 {@link DomainCategory} 를 쓴다. */
    private static boolean yesNoDomain(StandardTerm term) {
        return DomainCategory.of(term.domainName(), term.domainDataType()) == DomainCategory.YN;
    }

    /**
     * 여부 도메인 컬럼의 codemap 은 Y·N 만 내야 한다. 미매핑 코드를 그대로 통과시키면 레거시 플래그(1·T 등)가 그대로
     * 들어가므로 {@code unmapped: passthrough} 도 받지 않는다. 코드값은 싣지 않는다.
     */
    private static void checkYesNoCodemap(String name, CodeMap codemap, String location, List<String> errors) {
        boolean fallbackUsed = codemap.unmapped() == UnmappedPolicy.FALLBACK || codemap.nullAs() == NullPolicy.FALLBACK;
        if (!codemap.values().values().stream().allMatch(TargetStandardValidator::yesNoCode)
                || (fallbackUsed && !yesNoCode(codemap.fallback()))) {
            errors.add("여부 도메인 컬럼의 codemap 은 Y·N 만 내야 합니다(codemap '" + name + "'): " + location);
        }
        if (codemap.unmapped() == UnmappedPolicy.PASSTHROUGH) {
            errors.add("여부 도메인 컬럼의 codemap 은 unmapped: passthrough 를 쓸 수 없습니다 — 미매핑 레거시 값이 그대로"
                    + " 들어갑니다(codemap '" + name + "'): " + location);
        }
    }

    private static void check(TargetValueDomain value, TargetLimit limit, String location, String label,
                              List<String> errors) {
        check(value, limit, location, label, RowJudged.NONE, errors);
    }

    /**
     * 정적 판정 가운데 행마다 값 한계 가드로 옮긴 몫. {@code unknownPrecision} 은 선언 정밀도를 모르는 것만(ADR-0029 L3b),
     * {@code length}·{@code precision} 은 선언 길이·정밀도 판정 전부다(DEC-OPS-322).
     */
    private record RowJudged(boolean unknownPrecision, boolean length, boolean precision) {
        static final RowJudged NONE = new RowJudged(false, false, false);
    }

    /**
     * [DEC-OPS-322] 원장이 LENGTH_EXCEEDED 를 승인한 isolate 컬럼인가 — 그 컬럼의 선언 길이 판정을 값 한계 가드로 옮긴다.
     * 가드가 길이를 재는 값(문자·정확한 수)만 옮긴다. 날짜·UUID 처럼 가드가 길이를 재지 않는 값은 정적 판정을 그대로 받는다
     * — 옮기면 판정 없이 쓰기 단계까지 간다.
     */
    private static boolean lengthToRowGuard(ColumnMapping mapping, TargetValueDomain value) {
        return approvesIsolation(mapping, TargetValueGuard.Violation.LENGTH_EXCEEDED)
                && (value.family() == Family.TEXT || value.isExactNumeric());
    }

    /** [DEC-OPS-322] 원장이 PRECISION_EXCEEDED 를 승인한 isolate 컬럼의 정확한 수인가 — 정밀도 판정을 값 한계 가드로 옮긴다. */
    private static boolean precisionToRowGuard(ColumnMapping mapping, TargetValueDomain value) {
        return approvesIsolation(mapping, TargetValueGuard.Violation.PRECISION_EXCEEDED) && value.isExactNumeric();
    }

    private static boolean approvesIsolation(ColumnMapping mapping, TargetValueGuard.Violation violation) {
        return mapping.isolate() != null && mapping.isolate().violations().contains(violation.name());
    }

    /**
     * {@code rowJudged} 가 옮긴 판정은 오류로 두지 않는다 — 행마다 값 한계 가드({@link #rowGuards})가 판정한다. 값 종류와 대상의
     * 호환은 늘 정적으로 본다.
     */
    private static void check(TargetValueDomain value, TargetLimit limit, String location, String label,
                              RowJudged rowJudged, List<String> errors) {
        if (!value.compatibleWith(limit.family())) {
            errors.add("값 타입이 타깃과 맞지 않습니다: " + location + " — 값 " + value.family()
                    + (value.constant() ? "(const 는 type 힌트 없이 문자열로 바인딩됨)" : "")
                    + ", " + label
                    + (value.family() == Family.DATE && limit.family() == Family.TIMESTAMP
                    ? " — 날짜를 그날 00:00 일시로 쓰려면 transform: timestamp-from-date 를 선언하세요" : "")
                    + (value.family() == Family.TIMESTAMPTZ || value.family() == Family.TIMETZ
                    ? " — 시간대가 있는 값은 시간대 없는 컬럼에 쓰면 실행 환경의 시간대에 따라 다른 일시·시각이 됩니다. "
                    + ZONED_ESCAPE : ""));
            return;
        }
        if (limit.family() == Family.TEXT) {
            if (!rowJudged.length()) {
                checkLength(value, limit, location, label, errors);
            }
        } else if (limit.isExactNumeric() && value.isExactNumeric()) {
            if (!rowJudged.precision()) {
                checkCapacity(value, limit, location, label, rowJudged.unknownPrecision(), errors);
            }
        }
    }

    private static void checkLength(TargetValueDomain value, TargetLimit limit, String location, String label,
                                    List<String> errors) {
        // 부모 idStrategy 를 모르는 fkRef 값은 길이를 모른다 — 그때만 건너뛴다.
        if (limit.maxChars() == null || (value.generatedKey() && value.maxChars() == null)) {
            return;
        }
        Long length = value.textLength();
        if (length == null) {
            errors.add("값의 선언 최대 길이를 확인할 수 없습니다: " + location + " — " + label
                    + " 길이 " + limit.maxChars());
        } else if (length > limit.maxChars()) {
            errors.add("값의 선언 최대 길이가 타깃보다 깁니다: " + location + " — 값 " + length
                    + ", " + label + " 길이 " + limit.maxChars());
        }
    }

    private static void checkCapacity(TargetValueDomain value, TargetLimit limit, String location, String label,
                                      boolean rowJudged, List<String> errors) {
        if (value.family() == Family.INTEGER && limit.family() == Family.INTEGER) {
            if (value.integerRank() > limit.integerRank()) {
                errors.add("정수 범위가 타깃보다 넓습니다: " + location + " — " + label);
            }
            return;
        }
        if (limit.intDigits() == null) {
            return;
        }
        Integer intDigits = value.intDigits();
        Integer scale = value.scale();
        if (intDigits == null || scale == null) {
            if (!rowJudged) {
                errors.add("값의 선언 정밀도·소수 자릿수를 확인할 수 없습니다: " + location + " — " + label);
            }
            return;
        }
        if (scale > limit.scale()) {
            errors.add("소수 자릿수가 타깃보다 많아 반올림됩니다: " + location + " — 값 " + scale
                    + ", " + label + " " + limit.scale());
        }
        if (intDigits > limit.intDigits()) {
            errors.add("정수 자릿수가 타깃보다 많습니다: " + location + " — 값 " + intDigits
                    + ", " + label + " " + limit.intDigits());
        }
    }

    /** 도메인 행을 타깃 한계로 해석한다. 해석할 수 없으면 null. */
    static TargetLimit standardLimit(StandardTerm term) {
        String type = term.domainDataType() == null ? "" : term.domainDataType().toUpperCase(Locale.ROOT);
        Integer length = term.domainLength();
        return switch (type) {
            case "VARCHAR", "CHAR" -> length == null || length <= 0 ? null : TargetLimit.text(length.longValue());
            case "NUMERIC" -> numericDomain(term.domainName(), length);
            case "BIGINT" -> TargetLimit.integer(4);
            case "DATETIME" -> TargetLimit.of(Family.TIMESTAMP);
            case "DATE" -> TargetLimit.of(Family.DATE);
            default -> null;
        };
    }

    private static TargetLimit numericDomain(String domainName, Integer precision) {
        if (precision == null || precision <= 0) {
            return null;
        }
        int scale = 0;
        Matcher matcher = DOMAIN_SCALE.matcher(domainName == null ? "" : domainName);
        if (matcher.find()) {
            if (Integer.parseInt(matcher.group(1)) != precision) {
                return null;
            }
            scale = Integer.parseInt(matcher.group(2));
        }
        if (scale > precision) {
            return null;
        }
        return TargetLimit.decimal(precision - scale, scale);
    }

    private static CatalogObject sourceColumn(TableMapping table, ColumnMapping mapping, CatalogSnapshot inventory) {
        if (mapping.source() == null || mapping.source().isBlank()) {
            return null;
        }
        // [ADR-0029 L3d] 조회 컬럼(alias.COLUMN)은 조회 표의 컬럼이다. 별칭이 없으면 찾지 않는다(타입 확인 불가로 알린다).
        LookupRef ref = LookupRef.parse(mapping.source());
        if (ref != null) {
            MappingSpec.Lookup lookup = table.lookup(ref.alias());
            List<CatalogObject> matches = lookup == null || lookup.source() == null ? List.of()
                    : SourceLoadSurfaceGate.sourceColumns(inventory, lookup.source(), ref.column());
            return matches.size() == 1 ? matches.getFirst() : null;
        }
        List<CatalogObject> matches = SourceLoadSurfaceGate.sourceColumns(inventory, table, mapping.source());
        return matches.size() == 1 ? matches.getFirst() : null;
    }

    /** idStrategy 가 만드는 표준 ID 의 길이(접두사 + hex). 접두사가 없으면 null. */
    private static Long generatedIdLength(TableMapping table) {
        String prefix = table.idStrategy() == null ? null : table.idStrategy().generator();
        if (prefix == null) {
            return null;
        }
        return (long) prefix.trim().length() + StandardIdGenerator.hexLength(prefix);
    }

    /**
     * fkRef 가 가리키는 부모 매핑의 표준 ID 길이. 부모가 idStrategy 를 쓰지 않으면 null. [ADR-0029 L3c] 부모는 그 소스의
     * keymap 소유 매핑이다 — 한 소스를 나눈 매핑 가운데 키를 만드는 매핑의 접두사로 길이를 정한다.
     */
    private static Long parentIdLength(MappingSpec spec, String fkRef) {
        if (fkRef == null) {
            return null;
        }
        TableMapping parent = MappingIndex.of(spec.tables()).parent(fkRef);
        return parent == null ? null : generatedIdLength(parent);
    }

    /** 표준 ID 길이를 물리 컬럼과, 사전이 있으면 표준 도메인 중 좁은 쪽과 대조한다(DEC-OPS-307 ②). */
    private static void checkGeneratedId(TableMapping table, ColumnContract column, long length,
                                         boolean standardPresent, List<String> errors) {
        String location = location(table, column.name());
        TargetValueDomain value = TargetValueDomain.generatedKey(length);
        check(value, TargetLimit.physical(column), location, "물리 컬럼 " + column.dataType(), errors);
        StandardTerm term = column.term();
        if (!standardPresent || term == null || term.status() != TermStatus.FOUND) {
            return;
        }
        TargetLimit domain = standardLimit(term);
        if (domain != null && domain.family() == Family.TEXT) {
            check(value, domain, location, "표준 도메인 " + term.domainName(), errors);
        }
    }

    private static String location(TableMapping table, String column) {
        return table.target() + "." + column;
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT);
    }

    private static boolean yesNoCode(String code) {
        return "Y".equals(code) || "N".equals(code);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
