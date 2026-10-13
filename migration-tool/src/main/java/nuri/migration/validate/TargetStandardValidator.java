package nuri.migration.validate;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.keymap.StandardIdGenerator;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.postgres.TargetSchemaFingerprint;
import nuri.migration.postgres.TargetStandardSnapshot;
import nuri.migration.postgres.TargetStandardSnapshot.ColumnContract;
import nuri.migration.postgres.TargetStandardSnapshot.StandardStatus;
import nuri.migration.postgres.TargetStandardSnapshot.StandardTerm;
import nuri.migration.postgres.TargetStandardSnapshot.TableContract;
import nuri.migration.postgres.TargetStandardSnapshot.TermStatus;
import nuri.migration.validate.TargetValueDomain.Family;
import nuri.migration.workflow.SourceLoadSurfaceGate;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
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
 * </ul>
 *
 * <p>메시지는 표·컬럼 이름과 타입·길이만 말한다. 상수·코드맵 값과 행 값은 싣지 않는다.
 */
public final class TargetStandardValidator {

    private static final Pattern DOMAIN_SCALE = Pattern.compile("(\\d+),(\\d+)$");

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
        CatalogObject source = sourceColumn(table, mapping, inventory);
        TargetValueDomain value = TargetValueDomain.of(mapping, spec.codemaps(), builtinTransformer, source);
        if (value.exempt()) {
            return;
        }
        if (value.family() == Family.UNKNOWN) {
            errors.add("소스 컬럼의 타입을 승인 inventory 에서 확인할 수 없습니다(없음·모호·미지원): "
                    + location + " ← " + table.source() + "." + mapping.source());
            return;
        }
        if (mapping.encrypt() != null) {
            // [DEC-OPS-308] 숫자·날짜를 문자열로 바꾸면 앞자리 0·표기가 달라져 다른 값이 암호화된다. 내장 변환기는
            //   toString 으로 바꾸므로 정규화가 아니다 — 정규화는 내장이 아닌 변환기로 선언한다(그때는 위에서 exempt).
            if (value.family() != Family.TEXT || TargetValueDomain.fromSource(source).family() != Family.TEXT) {
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
        check(value, physical, location, "물리 컬럼 " + column.dataType(), errors);
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
            check(value, domain, location, "표준 도메인 " + term.domainName(), errors);
        }
    }

    private static void check(TargetValueDomain value, TargetLimit limit, String location, String label,
                              List<String> errors) {
        if (!value.compatibleWith(limit.family())) {
            errors.add("값 타입이 타깃과 맞지 않습니다: " + location + " — 값 " + value.family()
                    + (value.constant() ? "(const 는 type 힌트 없이 문자열로 바인딩됨)" : "")
                    + ", " + label);
            return;
        }
        if (limit.family() == Family.TEXT) {
            checkLength(value, limit, location, label, errors);
        } else if (limit.isExactNumeric() && value.isExactNumeric()) {
            checkCapacity(value, limit, location, label, errors);
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
                                      List<String> errors) {
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
            errors.add("값의 선언 정밀도·소수 자릿수를 확인할 수 없습니다: " + location + " — " + label);
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

    /** fkRef 가 가리키는 부모 매핑의 표준 ID 길이. 부모가 idStrategy 를 쓰지 않으면 null. */
    private static Long parentIdLength(MappingSpec spec, String fkRef) {
        if (fkRef == null) {
            return null;
        }
        return spec.tables().stream()
                .filter(parent -> parent != null && parent.source() != null && parent.source().equalsIgnoreCase(fkRef))
                .map(TargetStandardValidator::generatedIdLength)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
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
}
