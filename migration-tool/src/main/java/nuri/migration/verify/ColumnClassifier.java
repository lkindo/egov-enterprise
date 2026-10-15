package nuri.migration.verify;

import nuri.migration.domain.DomainCategory;
import nuri.migration.postgres.TargetStandardSnapshot.ColumnContract;
import nuri.migration.postgres.TargetStandardSnapshot.StandardTerm;
import nuri.migration.postgres.TargetStandardSnapshot.TermStatus;
import nuri.migration.transform.TypeConverter;
import nuri.migration.verify.ColumnCheck.Aggregate;
import nuri.migration.verify.ColumnCheck.Gap;
import nuri.migration.verify.ColumnCheck.SourceColumnType;

import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * [ADR-0029 L4 D2] 컬럼 하나를 어떤 검사로 대사할지 정한다. plan 과 load 가 같은 판정을 쓴다.
 *
 * <p>입력은 mapping·inventory·live 계약에서 뽑은 {@link ColumnFacts} 다 — 판정이 mapping 형식에 기대지 않게 한다. 규칙은 위에서
 * 먼저 걸린 것이 이긴다.</p>
 * <ol>
 *   <li>암호화 — 모든 검사를 하지 않는다({@link CoverageReason#ENCRYPTED}).</li>
 *   <li>상수 — NULL 계정·합·최소최대를 하지 않는다({@link CoverageReason#CONST}). 형식 도메인과 표본(상수 그대로)은 한다.</li>
 *   <li>fkRef·조회·생성 키 — 값 검사를 하지 않는다. at_most_one 조회는 대상 NULL 하한만 본다.</li>
 *   <li>원천 타입 모름·LOB·지원하지 않는 타입 — NULL 계정·표본을 하지 않는다.</li>
 *   <li>사용자 변환기 — NULL 보존을 가정하지 못해 NULL 계정·표본을 하지 않는다.</li>
 *   <li>그 밖 — NULL 계정을 한다. 정확 수치·시간대 없는 날짜일시를 변환 없이 같은 종류로 옮기면 합·최소최대를 한다.</li>
 * </ol>
 * <p>형식 도메인(YMD8·YMDHMS14·HMS6·YN)은 대상만 보는 검사라 암호화가 아니면 언제나 판정한다. 판정하지 않는 검사는 그 검사가
 * 이 컬럼에 쓰일 수 있을 때만 사유로 남긴다.</p>
 */
public final class ColumnClassifier {

    private static final Set<Integer> INTEGRAL = Set.of(Types.TINYINT, Types.SMALLINT, Types.INTEGER, Types.BIGINT);
    private static final Set<Integer> EXACT = Set.of(Types.TINYINT, Types.SMALLINT, Types.INTEGER, Types.BIGINT,
            Types.DECIMAL, Types.NUMERIC);
    private static final Set<Integer> FLOATING = Set.of(Types.FLOAT, Types.REAL, Types.DOUBLE);
    private static final Set<Integer> LOB = Set.of(Types.BLOB, Types.CLOB, Types.NCLOB, Types.LONGVARBINARY,
            Types.LONGVARCHAR, Types.LONGNVARCHAR, Types.BINARY, Types.VARBINARY);
    private static final Set<Integer> UNSUPPORTED = Set.of(Types.SQLXML, Types.ARRAY, Types.STRUCT, Types.OTHER,
            Types.JAVA_OBJECT, Types.DISTINCT, Types.REF, Types.ROWID, Types.DATALINK, Types.REF_CURSOR, Types.NULL);
    private static final Set<Integer> TEXT = Set.of(Types.CHAR, Types.VARCHAR, Types.NCHAR, Types.NVARCHAR);
    private static final Set<String> NUMERIC_HINTS = Set.of("int", "integer", "long", "bigint", "decimal", "numeric");
    private static final Set<String> NUMERIC_TARGETS = Set.of("smallint", "integer", "bigint", "numeric");
    private static final Set<String> TEXT_TARGETS = Set.of("character varying", "character", "text");
    private static final Set<DomainCategory> FORMAT_DOMAINS = Set.of(DomainCategory.DATE8, DomainCategory.DATETIME14,
            DomainCategory.TIME6, DomainCategory.YN);

    private ColumnClassifier() {
    }

    /** 컬럼 값이 어디서 오는가. */
    public enum Origin { SOURCE, CONSTANT, LOOKUP, NONE }

    /** 변환기 종류. 표준 도메인 변환기는 {@link #DOMAIN}, 그 밖 내장은 {@link #BUILTIN} 이다. */
    public enum TransformKind { NONE, BUILTIN, DOMAIN, CUSTOM }

    /**
     * 분류 입력(값 없음). mapping 의 컬럼 선언·inventory 의 원천 타입·live 대상 계약에서 뽑는다.
     *
     * @param sourceColumn 원천 컬럼({@link Origin#SOURCE} 일 때)
     * @param constant     상수({@link Origin#CONSTANT} 일 때)
     * @param lookupAlias  조회 별칭({@link Origin#LOOKUP} 일 때)
     * @param generated    대상 컬럼이 idStrategy·identity 대상 컬럼인가
     * @param sourceType   원천 타입. 모르면 null 이다
     * @param target       live 대상 컬럼 계약. 읽지 않았으면 null 이다 — 그때 도메인·합·최소최대는 사유 없이 생략한다
     */
    public record ColumnFacts(
            String targetColumn,
            Origin origin,
            String sourceColumn,
            String constant,
            String lookupAlias,
            boolean lookupAtMostOne,
            boolean encrypted,
            boolean fkRef,
            boolean generated,
            SourceColumnType sourceType,
            String transform,
            TransformKind transformKind,
            String codemap,
            boolean codemapNullFallback,
            String type,
            boolean nullify,
            ColumnContract target) {

        public ColumnFacts {
            origin = origin == null ? Origin.NONE : origin;
            transformKind = transformKind == null ? TransformKind.NONE : transformKind;
        }

        @Override
        public String toString() {
            return "ColumnFacts[" + targetColumn + "]";
        }
    }

    public static ColumnCheck classify(ColumnFacts facts) {
        String target = facts.targetColumn();
        String codemap = blankToNull(facts.codemap());
        SourceColumnType sourceType = facts.sourceType();
        Aggregate candidate = aggregateCandidate(facts, codemap);
        boolean numericSource = sourceType != null
                && (EXACT.contains(sourceType.jdbcType()) || FLOATING.contains(sourceType.jdbcType()));
        boolean aggregatable = candidate != Aggregate.NONE || numericSource;
        DomainCategory domain = domain(facts.target());
        List<Gap> gaps = new ArrayList<>();

        if (facts.encrypted()) {
            excludeValueChecks(gaps, CoverageReason.ENCRYPTED, aggregatable, codemap != null);
            if (domain != null) {
                gaps.add(new Gap(ReconciliationCheck.DOMAIN, CoverageReason.ENCRYPTED));
            }
            return new ColumnCheck(target, null, sourceType, Aggregate.NONE, false, false, codemap, false, null,
                    null, false, null, gaps);
        }
        if (facts.target() != null && facts.target().term() == null) {
            gaps.add(new Gap(ReconciliationCheck.DOMAIN, CoverageReason.NON_STANDARD_TARGET));
        }
        switch (facts.origin()) {
            case NONE -> {
                return new ColumnCheck(target, null, null, Aggregate.NONE, false, false, codemap, false, domain,
                        null, false, null, gaps);
            }
            case CONSTANT -> {
                gaps.add(new Gap(ReconciliationCheck.NON_NULL, CoverageReason.CONST));
                return new ColumnCheck(target, null, null, Aggregate.NONE, false, false, codemap, false, domain,
                        null, true, ColumnReplay.Column.constant(facts.constant()), gaps);
            }
            case LOOKUP -> {
                excludeValueChecks(gaps, CoverageReason.LOOKUP, aggregatable, codemap != null);
                String alias = facts.lookupAtMostOne() ? facts.lookupAlias() : null;
                return new ColumnCheck(target, null, sourceType, Aggregate.NONE, false, false, codemap, false,
                        domain, alias, false, null, gaps);
            }
            case SOURCE -> {
                // 아래에서 판정한다.
            }
        }
        String source = facts.sourceColumn() == null ? null : facts.sourceColumn().toLowerCase(Locale.ROOT);
        if (facts.fkRef() || facts.generated()) {
            CoverageReason reason = facts.fkRef() ? CoverageReason.FKREF : CoverageReason.GENERATED;
            excludeValueChecks(gaps, reason, aggregatable, codemap != null);
            return new ColumnCheck(target, source, sourceType, Aggregate.NONE, false, false, codemap, false,
                    domain, null, false, null, gaps);
        }
        boolean code = codemap != null;
        if (code && TypeConverter.isNonTextType(facts.type())) {
            code = false;
            gaps.add(new Gap(ReconciliationCheck.CODE_DISTRIBUTION, CoverageReason.CODE_TYPED));
        }
        boolean nullFallbackable = codemap != null && facts.codemapNullFallback();
        CoverageReason typeGap = sourceTypeGap(sourceType);
        if (typeGap != null) {
            gaps.add(new Gap(ReconciliationCheck.NON_NULL, typeGap));
            gaps.add(new Gap(ReconciliationCheck.SAMPLE, typeGap));
            return new ColumnCheck(target, source, sourceType, Aggregate.NONE, false, code, codemap,
                    nullFallbackable, domain, null, false, null, gaps);
        }
        boolean custom = facts.transformKind() == TransformKind.CUSTOM;
        if (custom) {
            gaps.add(new Gap(ReconciliationCheck.NON_NULL, CoverageReason.CUSTOM_TRANSFORM));
            gaps.add(new Gap(ReconciliationCheck.SAMPLE, CoverageReason.CUSTOM_TRANSFORM));
        }
        Aggregate aggregate = candidate;
        if (FLOATING.contains(sourceType.jdbcType())) {
            gaps.add(new Gap(ReconciliationCheck.SUM, CoverageReason.FLOAT));
            gaps.add(new Gap(ReconciliationCheck.MIN_MAX, CoverageReason.FLOAT));
        } else if (aggregate == Aggregate.NONE && TEXT.contains(sourceType.jdbcType()) && codemap == null
                && (facts.transformKind() == TransformKind.NONE || facts.transformKind() == TransformKind.BUILTIN)) {
            gaps.add(new Gap(ReconciliationCheck.SUM, CoverageReason.TEXT_DEFERRED));
            gaps.add(new Gap(ReconciliationCheck.MIN_MAX, CoverageReason.TEXT_DEFERRED));
        }
        boolean sampled = !custom && !facts.nullify();
        return new ColumnCheck(target, source, sourceType, aggregate, !custom, code, codemap, nullFallbackable,
                domain, null, sampled,
                sampled ? ColumnReplay.Column.source(facts.transform(), codemap, facts.type()) : null, gaps,
                facts.sourceColumn());
    }

    /** 값을 보는 검사(NULL 계정·표본, 쓰일 수 있으면 합·최소최대·코드 분포)를 같은 이유로 하지 않는다. */
    private static void excludeValueChecks(List<Gap> gaps, CoverageReason reason, boolean aggregatable,
                                           boolean codemap) {
        gaps.add(new Gap(ReconciliationCheck.NON_NULL, reason));
        if (aggregatable) {
            gaps.add(new Gap(ReconciliationCheck.SUM, reason));
            gaps.add(new Gap(ReconciliationCheck.MIN_MAX, reason));
        }
        if (codemap) {
            gaps.add(new Gap(ReconciliationCheck.CODE_DISTRIBUTION, reason));
        }
        gaps.add(new Gap(ReconciliationCheck.SAMPLE, reason));
    }

    private static CoverageReason sourceTypeGap(SourceColumnType type) {
        if (type == null) {
            return CoverageReason.SOURCE_TYPE_UNKNOWN;
        }
        if (LOB.contains(type.jdbcType())) {
            return CoverageReason.LOB;
        }
        if (UNSUPPORTED.contains(type.jdbcType())) {
            return CoverageReason.UNSUPPORTED_SOURCE_TYPE;
        }
        return null;
    }

    /**
     * 합·최소최대를 할 수 있는가. 변환기·codemap 없이 같은 종류로 옮기는 정확 수치(대상 smallint·integer·bigint·numeric)와
     * 시간대 없는 날짜·일시(대상 date·timestamp without time zone)만이다. 대상 계약을 읽지 않았으면 하지 않는다.
     */
    private static Aggregate aggregateCandidate(ColumnFacts facts, String codemap) {
        SourceColumnType source = facts.sourceType();
        ColumnContract target = facts.target();
        if (facts.origin() != Origin.SOURCE || source == null || target == null
                || facts.transformKind() != TransformKind.NONE || codemap != null) {
            return Aggregate.NONE;
        }
        String type = facts.type() == null ? null : facts.type().toLowerCase(Locale.ROOT);
        if (EXACT.contains(source.jdbcType())) {
            return (type == null || NUMERIC_HINTS.contains(type)) && NUMERIC_TARGETS.contains(target.dataType())
                    ? Aggregate.NUM : Aggregate.NONE;
        }
        if (source.jdbcType() == Types.DATE) {
            return (type == null || type.equals("date")) && target.dataType().equals("date")
                    ? Aggregate.TEMPORAL : Aggregate.NONE;
        }
        if (source.jdbcType() == Types.TIMESTAMP) {
            return (type == null || type.equals("timestamp") || type.equals("datetime"))
                    && target.dataType().equals("timestamp without time zone")
                    ? Aggregate.TEMPORAL : Aggregate.NONE;
        }
        return Aggregate.NONE;
    }

    /** 대상이 문자형이고 표준 용어의 도메인이 형식 도메인이면 그 범주. 아니면 null. */
    private static DomainCategory domain(ColumnContract target) {
        if (target == null || target.term() == null || !TEXT_TARGETS.contains(target.dataType())) {
            return null;
        }
        StandardTerm term = target.term();
        if (term.status() != TermStatus.FOUND) {
            return null;
        }
        DomainCategory category = DomainCategory.of(term.domainName(), term.domainDataType());
        return FORMAT_DOMAINS.contains(category) ? category : null;
    }

    /** 정수 계열 원천인가 — 합을 DECIMAL(38,0) 으로 잰다. */
    static boolean integral(int jdbcType) {
        return INTEGRAL.contains(jdbcType);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
