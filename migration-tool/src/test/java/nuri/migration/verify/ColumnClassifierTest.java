package nuri.migration.verify;

import nuri.migration.domain.DomainCategory;
import nuri.migration.postgres.TargetStandardSnapshot.ColumnContract;
import nuri.migration.postgres.TargetStandardSnapshot.StandardTerm;
import nuri.migration.postgres.TargetStandardSnapshot.TermStatus;
import nuri.migration.verify.ColumnCheck.Aggregate;
import nuri.migration.verify.ColumnCheck.Gap;
import nuri.migration.verify.ColumnCheck.SourceColumnType;
import nuri.migration.verify.ColumnClassifier.ColumnFacts;
import nuri.migration.verify.ColumnClassifier.Origin;
import nuri.migration.verify.ColumnClassifier.TransformKind;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Types;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * [ADR-0029 L4 D2] 컬럼 분류 — 어떤 검사를 켜고 어떤 검사를 어떤 이유로 판정하지 않는지.
 *
 * <p>분류가 틀리면 대사가 조용히 비거나(검사를 꺼 버림) 거짓 FAIL 을 낸다(변환이 값을 바꾸는 컬럼을 합으로 비교). 규칙 표의
 * 행마다 한 사례를 둔다.</p>
 */
@DisplayName("대사 컬럼 분류")
class ColumnClassifierTest {

    static final SourceColumnType INT = new SourceColumnType(Types.INTEGER, "int4", 10L, 0);
    static final SourceColumnType DECIMAL = new SourceColumnType(Types.NUMERIC, "numeric", 12L, 2);
    static final SourceColumnType DOUBLE = new SourceColumnType(Types.DOUBLE, "float8", 17L, 0);
    static final SourceColumnType VARCHAR = new SourceColumnType(Types.VARCHAR, "varchar", 20L, 0);
    static final SourceColumnType DATE = new SourceColumnType(Types.DATE, "date", 10L, 0);
    static final SourceColumnType TIMESTAMP = new SourceColumnType(Types.TIMESTAMP, "timestamp", 29L, 6);
    static final SourceColumnType CLOB = new SourceColumnType(Types.CLOB, "clob", null, null);
    static final SourceColumnType XML = new SourceColumnType(Types.SQLXML, "xml", null, null);

    @Test
    @DisplayName("정확 수치를 변환 없이 수치 대상에 옮기면 NULL 계정·합·최소최대·표본을 한다")
    void exactNumberDirectCopyAggregates() {
        ColumnCheck check = ColumnClassifier.classify(facts().source("AMT", INT).target(contract("integer")).build());

        assertThat(check.aggregate()).isEqualTo(Aggregate.NUM);
        assertThat(check.nonNull()).isTrue();
        assertThat(check.sampled()).isTrue();
        assertThat(check.sourceColumn()).isEqualTo("amt");
        assertThat(check.gaps()).isEmpty();
        assertThat(ColumnClassifier.classify(facts().source("AMT", DECIMAL).type("decimal")
                .target(contract("numeric")).build()).aggregate()).isEqualTo(Aggregate.NUM);
    }

    @Test
    @DisplayName("변환·codemap·문자 type 이 있거나 대상 계약이 없으면 합을 하지 않는다")
    void numberWithConversionOrUnknownTargetDoesNotAggregate() {
        assertThat(ColumnClassifier.classify(facts().source("AMT", INT).transform("trim", TransformKind.BUILTIN)
                .target(contract("integer")).build()).aggregate()).isEqualTo(Aggregate.NONE);
        assertThat(ColumnClassifier.classify(facts().source("AMT", INT).codemap("cm")
                .target(contract("character varying")).build()).aggregate()).isEqualTo(Aggregate.NONE);
        assertThat(ColumnClassifier.classify(facts().source("AMT", INT).type("string")
                .target(contract("integer")).build()).aggregate()).isEqualTo(Aggregate.NONE);
        assertThat(ColumnClassifier.classify(facts().source("AMT", INT).build()).aggregate())
                .as("계약을 읽지 않았으면 사유 없이 생략한다").isEqualTo(Aggregate.NONE);
        assertThat(ColumnClassifier.classify(facts().source("AMT", INT).target(contract("character varying"))
                .build()).aggregate()).isEqualTo(Aggregate.NONE);
    }

    @Test
    @DisplayName("부동소수 원천은 합·최소최대를 FLOAT 로 판정하지 않는다")
    void floatingSourceIsNotSummed() {
        ColumnCheck check = ColumnClassifier.classify(facts().source("RATE", DOUBLE).target(contract("numeric"))
                .build());

        assertThat(check.aggregate()).isEqualTo(Aggregate.NONE);
        assertThat(check.nonNull()).isTrue();
        assertThat(check.gaps()).containsExactly(
                new Gap(ReconciliationCheck.SUM, CoverageReason.FLOAT),
                new Gap(ReconciliationCheck.MIN_MAX, CoverageReason.FLOAT));
    }

    @Test
    @DisplayName("시간대 없는 날짜·일시를 같은 종류로 옮기면 최소최대를 한다 — 종류가 다르면 하지 않는다")
    void temporalSameKindAggregates() {
        assertThat(ColumnClassifier.classify(facts().source("D", DATE).target(contract("date")).build()).aggregate())
                .isEqualTo(Aggregate.TEMPORAL);
        assertThat(ColumnClassifier.classify(facts().source("D", DATE).type("date").target(contract("date"))
                .build()).aggregate()).isEqualTo(Aggregate.TEMPORAL);
        assertThat(ColumnClassifier.classify(facts().source("T", TIMESTAMP).type("datetime")
                .target(contract("timestamp without time zone")).build()).aggregate()).isEqualTo(Aggregate.TEMPORAL);
        assertThat(ColumnClassifier.classify(facts().source("T", TIMESTAMP).target(contract("date")).build())
                .aggregate()).as("일시를 날짜로 옮기면 값이 바뀔 수 있다").isEqualTo(Aggregate.NONE);
        assertThat(ColumnClassifier.classify(facts().source("D", DATE).type("timestamp").target(contract("date"))
                .build()).aggregate()).isEqualTo(Aggregate.NONE);
        assertThat(ColumnClassifier.classify(facts().source("T", TIMESTAMP)
                .target(contract("timestamp with time zone")).build()).aggregate()).isEqualTo(Aggregate.NONE);
    }

    @Test
    @DisplayName("문자 직접 컬럼은 합·최소최대를 TEXT_DEFERRED 로 미룬다")
    void textDirectIsDeferred() {
        ColumnCheck check = ColumnClassifier.classify(facts().source("NM", VARCHAR)
                .target(contract("character varying")).build());

        assertThat(check.nonNull()).isTrue();
        assertThat(check.sampled()).isTrue();
        assertThat(check.gaps()).containsExactly(
                new Gap(ReconciliationCheck.SUM, CoverageReason.TEXT_DEFERRED),
                new Gap(ReconciliationCheck.MIN_MAX, CoverageReason.TEXT_DEFERRED));
        assertThat(ColumnClassifier.classify(facts().source("NM", VARCHAR).transform("ymd8", TransformKind.DOMAIN)
                .target(contract("character varying")).build()).gaps())
                .as("도메인 변환기를 거친 값은 길이 대사 대상이 아니다").isEmpty();
    }

    @Test
    @DisplayName("암호화 컬럼은 모든 검사를 ENCRYPTED 로 판정하지 않는다")
    void encryptedExcludesEverything() {
        ColumnCheck check = ColumnClassifier.classify(facts().source("RRNO", VARCHAR).encrypted()
                .target(contract("character varying", term("연월일C8", "VARCHAR"))).build());

        assertThat(check.nonNull()).isFalse();
        assertThat(check.sampled()).isFalse();
        assertThat(check.domain()).isNull();
        assertThat(check.gaps()).extracting(Gap::reason).containsOnly(CoverageReason.ENCRYPTED);
        assertThat(check.gaps()).extracting(Gap::check).containsExactly(ReconciliationCheck.NON_NULL,
                ReconciliationCheck.SAMPLE, ReconciliationCheck.DOMAIN);
    }

    @Test
    @DisplayName("상수는 NULL 계정을 CONST 로 하지 않고 표본(상수 그대로)과 형식 도메인은 한다")
    void constantKeepsDomainAndSample() {
        ColumnCheck check = ColumnClassifier.classify(facts().constant("Y")
                .target(contract("character", term("여부C1", "CHAR"))).build());

        assertThat(check.nonNull()).isFalse();
        assertThat(check.sampled()).isTrue();
        assertThat(check.replay()).isEqualTo(ColumnReplay.Column.constant("Y"));
        assertThat(check.domain()).isEqualTo(DomainCategory.YN);
        assertThat(check.gaps()).containsExactly(new Gap(ReconciliationCheck.NON_NULL, CoverageReason.CONST));
    }

    @Test
    @DisplayName("fkRef·생성 키·조회는 값 검사를 하지 않고, at_most_one 조회만 대상 NULL 하한을 본다")
    void keysAndLookupsExcludeValueChecks() {
        ColumnCheck fk = ColumnClassifier.classify(facts().source("PARENT_ID", INT).fkRef()
                .target(contract("integer")).build());
        ColumnCheck generated = ColumnClassifier.classify(facts().source("ID", INT).generated()
                .target(contract("integer")).build());
        ColumnCheck atMostOne = ColumnClassifier.classify(facts().lookup("dept", true).build());
        ColumnCheck exactlyOne = ColumnClassifier.classify(facts().lookup("dept", false).build());

        assertThat(fk.nonNull()).isFalse();
        assertThat(fk.aggregate()).isEqualTo(Aggregate.NONE);
        assertThat(fk.gaps()).extracting(Gap::reason).containsOnly(CoverageReason.FKREF);
        assertThat(fk.gaps()).extracting(Gap::check).contains(ReconciliationCheck.SUM, ReconciliationCheck.MIN_MAX);
        assertThat(generated.gaps()).extracting(Gap::reason).containsOnly(CoverageReason.GENERATED);
        assertThat(atMostOne.lookupAlias()).isEqualTo("dept");
        assertThat(atMostOne.gaps()).extracting(Gap::reason).containsOnly(CoverageReason.LOOKUP);
        assertThat(exactlyOne.lookupAlias()).isNull();
    }

    @Test
    @DisplayName("원천 타입을 모르거나 LOB·지원하지 않는 타입이면 NULL 계정·표본을 하지 않는다")
    void unknownLobAndUnsupportedSourceTypes() {
        assertThat(ColumnClassifier.classify(facts().source("X", null).build()).gaps()).containsExactly(
                new Gap(ReconciliationCheck.NON_NULL, CoverageReason.SOURCE_TYPE_UNKNOWN),
                new Gap(ReconciliationCheck.SAMPLE, CoverageReason.SOURCE_TYPE_UNKNOWN));
        ColumnCheck lob = ColumnClassifier.classify(facts().source("BODY", CLOB).build());
        assertThat(lob.nonNull()).isFalse();
        assertThat(lob.sampled()).isFalse();
        assertThat(lob.gaps()).extracting(Gap::reason).containsOnly(CoverageReason.LOB);
        assertThat(ColumnClassifier.classify(facts().source("DOC", XML).build()).gaps())
                .extracting(Gap::reason).containsOnly(CoverageReason.UNSUPPORTED_SOURCE_TYPE);
    }

    @Test
    @DisplayName("사용자 변환기는 NULL 계정·표본을 CUSTOM_TRANSFORM 으로 하지 않는다 — 내장·도메인 변환기는 한다")
    void customTransformExcludesNullAccounting() {
        ColumnCheck custom = ColumnClassifier.classify(facts().source("NM", VARCHAR)
                .transform("legacy-name", TransformKind.CUSTOM).build());
        ColumnCheck builtin = ColumnClassifier.classify(facts().source("NM", VARCHAR)
                .transform("trim", TransformKind.BUILTIN).build());

        assertThat(custom.nonNull()).isFalse();
        assertThat(custom.sampled()).isFalse();
        assertThat(custom.gaps()).containsExactly(
                new Gap(ReconciliationCheck.NON_NULL, CoverageReason.CUSTOM_TRANSFORM),
                new Gap(ReconciliationCheck.SAMPLE, CoverageReason.CUSTOM_TRANSFORM));
        assertThat(builtin.nonNull()).isTrue();
        assertThat(builtin.sampled()).isTrue();
        assertThat(builtin.replay()).isEqualTo(ColumnReplay.Column.source("trim", null, null));
    }

    @Test
    @DisplayName("codemap 은 결과 분포를 대사하고, 비문자 type 이면 CODE_TYPED 로 하지 않는다")
    void codemapDistribution() {
        ColumnCheck text = ColumnClassifier.classify(facts().source("ST", VARCHAR).codemap("status")
                .nullFallback().build());
        ColumnCheck typed = ColumnClassifier.classify(facts().source("ST", VARCHAR).codemap("status").type("int")
                .build());

        assertThat(text.code()).isTrue();
        assertThat(text.nullFallbackable()).isTrue();
        assertThat(text.sampled()).isTrue();
        assertThat(text.gaps()).isEmpty();
        assertThat(typed.code()).isFalse();
        assertThat(typed.gaps()).containsExactly(
                new Gap(ReconciliationCheck.CODE_DISTRIBUTION, CoverageReason.CODE_TYPED));
    }

    @Test
    @DisplayName("문자 대상의 형식 도메인 용어면 그 범주를 판정하고, 용어가 없으면 NON_STANDARD_TARGET 이다")
    void formatDomainFromLiveTerm() {
        assertThat(ColumnClassifier.classify(facts().source("YMD", VARCHAR)
                .target(contract("character varying", term("연월일C8", "VARCHAR"))).build()).domain())
                .isEqualTo(DomainCategory.DATE8);
        assertThat(ColumnClassifier.classify(facts().source("DT", VARCHAR)
                .target(contract("character varying", term("연월일시분초C14", "VARCHAR"))).build()).domain())
                .isEqualTo(DomainCategory.DATETIME14);
        assertThat(ColumnClassifier.classify(facts().source("TM", VARCHAR)
                .target(contract("character", term("시분초C6", "CHAR"))).build()).domain())
                .isEqualTo(DomainCategory.TIME6);
        assertThat(ColumnClassifier.classify(facts().source("YMD", VARCHAR)
                .target(contract("date", term("연월일C8", "VARCHAR"))).build()).domain())
                .as("문자 대상만 형식 도메인을 본다").isNull();
        assertThat(ColumnClassifier.classify(facts().source("NM", VARCHAR)
                .target(contract("character varying", term("명V100", "VARCHAR"))).build()).domain()).isNull();
        assertThat(ColumnClassifier.classify(facts().source("YMD", VARCHAR)
                .target(contract("character varying", new StandardTerm(TermStatus.AMBIGUOUS, "YMD", "연월일C8",
                        "VARCHAR", 8))).build()).domain()).isNull();
        assertThat(ColumnClassifier.classify(facts().source("NM", VARCHAR).target(contract("character varying", null))
                .build()).gaps()).contains(new Gap(ReconciliationCheck.DOMAIN, CoverageReason.NON_STANDARD_TARGET));
        assertThat(ColumnClassifier.classify(facts().source("NM", VARCHAR).build()).gaps())
                .as("계약을 읽지 않았으면 용어 없음으로 보지 않는다")
                .doesNotContain(new Gap(ReconciliationCheck.DOMAIN, CoverageReason.NON_STANDARD_TARGET));
        assertThat(ColumnClassifier.classify(facts().lookup("dept", true)
                .target(contract("character", term("여부C1", "CHAR"))).build()).domain())
                .as("형식 도메인은 대상만 보는 검사라 조회 컬럼도 판정한다").isEqualTo(DomainCategory.YN);
    }

    @Test
    @DisplayName("nullify 가 있으면 표본에 넣지 않는다 — 표본은 실행기의 NULL 대체를 다시 하지 않는다")
    void nullifyIsNotSampled() {
        ColumnCheck check = ColumnClassifier.classify(facts().source("YMD", VARCHAR)
                .transform("ymd8", TransformKind.DOMAIN).nullify().build());

        assertThat(check.nonNull()).isTrue();
        assertThat(check.sampled()).isFalse();
        assertThat(check.replay()).isNull();
    }

    /** 형식 도메인이 아닌 표준 용어가 있는 대상 컬럼. */
    static ColumnContract contract(String dataType) {
        return contract(dataType, term("명V100", "VARCHAR"));
    }

    static ColumnContract contract(String dataType, StandardTerm term) {
        return new ColumnContract("c", 1, dataType, null, null, null, true, false, null, false, term);
    }

    static StandardTerm term(String domainName, String domainDataType) {
        return new StandardTerm(TermStatus.FOUND, "C", domainName, domainDataType, 8);
    }

    static Facts facts() {
        return new Facts();
    }

    /** 시험용 입력 작성기. */
    static final class Facts {
        private String target = "tgt_col";
        private Origin origin = Origin.SOURCE;
        private String source = "SRC_COL";
        private String constant;
        private String alias;
        private boolean atMostOne;
        private boolean encrypted;
        private boolean fkRef;
        private boolean generated;
        private SourceColumnType type = VARCHAR;
        private String transform;
        private TransformKind transformKind = TransformKind.NONE;
        private String codemap;
        private boolean nullFallback;
        private String typeHint;
        private boolean nullify;
        private ColumnContract contract;

        Facts target(String name) {
            this.target = name;
            return this;
        }

        Facts source(String column, SourceColumnType sourceType) {
            this.origin = Origin.SOURCE;
            this.source = column;
            this.type = sourceType;
            return this;
        }

        Facts constant(String value) {
            this.origin = Origin.CONSTANT;
            this.source = null;
            this.constant = value;
            this.type = null;
            return this;
        }

        Facts lookup(String lookupAlias, boolean optional) {
            this.origin = Origin.LOOKUP;
            this.source = null;
            this.alias = lookupAlias;
            this.atMostOne = optional;
            return this;
        }

        Facts encrypted() {
            this.encrypted = true;
            return this;
        }

        Facts fkRef() {
            this.fkRef = true;
            return this;
        }

        Facts generated() {
            this.generated = true;
            return this;
        }

        Facts transform(String name, TransformKind kind) {
            this.transform = name;
            this.transformKind = kind;
            return this;
        }

        Facts codemap(String name) {
            this.codemap = name;
            return this;
        }

        Facts nullFallback() {
            this.nullFallback = true;
            return this;
        }

        Facts type(String hint) {
            this.typeHint = hint;
            return this;
        }

        Facts nullify() {
            this.nullify = true;
            return this;
        }

        Facts target(ColumnContract column) {
            this.contract = column;
            return this;
        }

        ColumnFacts build() {
            return new ColumnFacts(target, origin, source, constant, alias, atMostOne, encrypted, fkRef, generated,
                    type, transform, transformKind, codemap, nullFallback, typeHint, nullify, contract);
        }
    }
}
