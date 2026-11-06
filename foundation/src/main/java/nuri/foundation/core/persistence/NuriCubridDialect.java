package nuri.foundation.core.persistence;

import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.hibernate.QueryTimeoutException;
import org.hibernate.boot.model.TypeContributions;
import org.hibernate.cfg.JdbcSettings;
import org.hibernate.community.dialect.CUBRIDDialect;
import org.hibernate.dialect.DmlTargetColumnQualifierSupport;
import org.hibernate.dialect.lock.internal.LockingSupportSimple;
import org.hibernate.dialect.lock.spi.LockingSupport;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;
import org.hibernate.engine.jdbc.env.spi.IdentifierHelper;
import org.hibernate.engine.jdbc.env.spi.IdentifierHelperBuilder;
import org.hibernate.exception.ConstraintViolationException;
import org.hibernate.exception.ConstraintViolationException.ConstraintKind;
import org.hibernate.exception.LockAcquisitionException;
import org.hibernate.exception.LockTimeoutException;
import org.hibernate.exception.spi.SQLExceptionConversionDelegate;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.service.ServiceRegistry;
import org.hibernate.sql.ast.SqlAstTranslator;
import org.hibernate.sql.ast.SqlAstTranslatorFactory;
import org.hibernate.sql.ast.spi.StandardSqlAstTranslatorFactory;
import org.hibernate.sql.exec.spi.JdbcOperation;
import org.hibernate.type.SqlTypes;
import org.hibernate.type.descriptor.jdbc.spi.JdbcTypeRegistry;

/**
 * 커뮤니티 CUBRID 방언이 버리는 비관적 잠금을 되살린다(ADR-0047 단계 5, 제한 지원).
 *
 * <p>Hibernate 7.4 의 커뮤니티 {@link CUBRIDDialect} 는 {@code PESSIMISTIC_WRITE} 에도 잠금 절을 붙이지 않는다 — 잠근다고 믿은 행을 다른
 * 트랜잭션이 그대로 읽고 고친다. CUBRID 의 {@code SELECT ... FOR UPDATE} 는 같은 행의 잠금 조회와 자식 FK 입력을 막고, 대기 상한이 지나면
 * -75 로 끝난다(2026-11-05 실측). 그래서 모든 비관적 잠금을 {@code FOR UPDATE} 로 낸다.
 *
 * <p>CUBRID 에는 {@code NOWAIT}·{@code SKIP LOCKED}·문장 단위 대기 상한이 없다. 잠금 대기 힌트는 쓰지 않고, 대기는 연결 초기화가 거는 세션
 * 상한({@code SET TRANSACTION LOCK TIMEOUT})이 묶는다. SKIP LOCKED 를 바라는 작업 선점은 앞 작업을 기다린 뒤 행을 다시 판정해 다음
 * 대기 행을 받는다 — 결과는 같고 처리량이 준다(실측, 원장의 저하 안내).
 */
public class NuriCubridDialect extends CUBRIDDialect {

    public NuriCubridDialect() {
    }

    public NuriCubridDialect(DialectResolutionInfo info) {
        super(info);
    }

    /**
     * 생성 키는 같은 연결의 {@code LAST_INSERT_ID()} 로 읽는다. 드라이버의 {@code getGeneratedKeys} 는 OID 를 재사용하는 표(11.x 기본)에서
     * -983 을 내거나 키 없이 끝난다(2026-11-06 실측). 기본 속성은 설정 파일 값보다 먼저 깔리므로 설정이 이 값을 덮을 수 있다.
     */
    @Override
    protected void initDefaultProperties() {
        super.initDefaultProperties();
        getDefaultProperties().setProperty(JdbcSettings.USE_GET_GENERATED_KEYS, "false");
    }

    /**
     * UUID 는 {@code CHAR(36)} 문자열이다(어댑터의 표). 커뮤니티 방언의 UUID 매핑은 16비트 BIT 라 값이 깨진다. UUID 를 CHAR 저장 타입으로
     * 바인딩해 {@code UUID.toString()} 의 소문자 표기를 쓴다 — {@code hibernate.type.preferred_uuid_jdbc_type=CHAR} 와 같은 결과다.
     */
    @Override
    public void contributeTypes(TypeContributions typeContributions, ServiceRegistry serviceRegistry) {
        super.contributeTypes(typeContributions, serviceRegistry);
        JdbcTypeRegistry registry = typeContributions.getTypeConfiguration().getJdbcTypeRegistry();
        registry.addDescriptor(SqlTypes.UUID, registry.getDescriptor(SqlTypes.CHAR));
    }

    /**
     * 긴 문자열(PostgreSQL text)은 어댑터가 STRING(최대 길이 VARCHAR)으로 옮기고, 드라이버는 그 컬럼을 VARCHAR 로 답한다. Hibernate 는 긴 문자열
     * 속성에 LONG32VARCHAR 를 기대해 스키마 검증이 불일치로 본다(2026-11-06 실측). 둘 다 문자열 바인딩이라 같은 타입으로 본다. CLOB 은 바인딩이 달라 넣지 않는다.
     */
    @Override
    public boolean equivalentTypes(int typeCode1, int typeCode2) {
        return super.equivalentTypes(typeCode1, typeCode2) || isText(typeCode1) && isText(typeCode2);
    }

    private static boolean isText(int typeCode) {
        return typeCode == SqlTypes.VARCHAR || typeCode == SqlTypes.LONGVARCHAR || typeCode == SqlTypes.LONG32VARCHAR;
    }

    /**
     * 따옴표로 낼 예약어. 어댑터가 DDL 에서 따옴표로 감싸는 컬럼 이름과 같다(project-composer-vendor-cubrid.mjs 의 RESERVED, 벤더 시험이 대조한다).
     * 그 밖의 이름은 CUBRID 가 따옴표 없이 받으므로(번역 기준선이 그대로 적용된다) 이 둘만 따옴표로 낸다 — 표준 예약어까지 따옴표로 내면 생성 SQL 이
     * 쓸데없이 달라진다.
     */
    static final Set<String> RESERVED_IDENTIFIERS = Set.of("role", "data_type");

    /**
     * 자동 따옴표를 먼저 켠다 — 빌더는 꺼진 동안 예약어를 받지 않고 버린다. JDBC 환경은 설정({@code hibernate.auto_quote_keyword}, 기본 false)을 건 빌더를
     * 넘기므로, 예약어를 먼저 넣으면 목록이 빈 채로 따옴표 없이 예약어 컬럼을 내 그 표의 쓰기가 문법 오류였다(2026-11-06 원본 통합 실행·실측).
     * 따옴표 설정을 대소문자 규칙보다 먼저 거는 것은 이 메서드가 SQLException 을 내면 Hibernate 가 같은 빌더로 기본 도우미를 만들기 때문이다.
     */
    @Override
    public IdentifierHelper buildIdentifierHelper(IdentifierHelperBuilder builder, DatabaseMetaData metadata) throws SQLException {
        builder.setAutoQuoteKeywords(true);
        builder.clearReservedWords();
        builder.applyReservedWords(RESERVED_IDENTIFIERS);
        builder.setNameQualifierSupport(getNameQualifierSupport());
        try {
            builder.applyIdentifierCasing(metadata);
        } catch (SQLException unknownCasing) {
            // 대소문자 규칙만 기본값으로 둔다.
        }
        return builder.build();
    }

    /**
     * CUBRID 는 SQLState 를 주지 않아 Hibernate 가 제약 위반·잠금 실패를 가르지 못한다(JpaSystemException 이 된다, 2026-11-06 실측). 번호로 가른다.
     * NOT NULL 위반은 BEFORE 트리거가 있는 표에서 -631 대신 -205 다 — CHECK 트리거가 있는 표가 그렇다(실측). CHECK 위반은 어댑터의 ck_ 트리거
     * 거부(-517)만이다. 문장 시간 초과는 -4 다.
     */
    @Override
    public SQLExceptionConversionDelegate buildSQLExceptionConversionDelegate() {
        return (failure, message, sql) -> {
            String text = String.valueOf(failure.getMessage());
            return switch (failure.getErrorCode()) {
                case -670 -> new ConstraintViolationException(message, failure, sql, ConstraintKind.UNIQUE, first(UNIQUE_INDEX, text));
                case -922, -924 -> new ConstraintViolationException(message, failure, sql, ConstraintKind.FOREIGN_KEY, first(FOREIGN_KEY, text));
                case -631, -205 -> new ConstraintViolationException(message, failure, sql, ConstraintKind.NOT_NULL, null);
                case -517 -> {
                    String check = first(CHECK_TRIGGER, text);
                    yield check == null ? null : new ConstraintViolationException(message, failure, sql, ConstraintKind.CHECK, check);
                }
                case -75 -> new LockTimeoutException(message, failure, sql);
                case -72 -> new LockAcquisitionException(message, failure, sql);
                case -4 -> new QueryTimeoutException(message, failure, sql);
                default -> null;
            };
        };
    }

    /** {@code INDEX uk_x(B+tree: ...) ON CLASS ...}(-670), {@code the foreign key 'fk_x'}(-922·-924), {@code rejected by trigger "owner.ck_x_i"}(-517). */
    private static final Pattern UNIQUE_INDEX = Pattern.compile("\\bINDEX (\\w+)\\(");
    private static final Pattern FOREIGN_KEY = Pattern.compile("foreign key '(\\w+)'");
    private static final Pattern CHECK_TRIGGER = Pattern.compile("rejected by trigger \"[^\".]+\\.(ck_\\w+)_[iu]\"");

    private static String first(Pattern pattern, String text) {
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(1) : null;
    }

    /** 대량 갱신·삭제의 조건이 대상 표의 별칭을 쓴다(필터·{@code @SQLRestriction}). CUBRID 는 {@code UPDATE 표 별칭 SET ...} 을 받는다(2026-11-06 실측). */
    @Override
    public DmlTargetColumnQualifierSupport getDmlTargetColumnQualifierSupport() {
        return DmlTargetColumnQualifierSupport.TABLE_ALIAS;
    }

    /** 대상 표 뒤에 그 별칭을 내는 번역기(NuriCubridSqlAstTranslator). 열 한정자 설정만으로는 별칭이 선언되지 않는다. */
    @Override
    public SqlAstTranslatorFactory getSqlAstTranslatorFactory() {
        return new StandardSqlAstTranslatorFactory() {
            @Override
            protected <T extends JdbcOperation> SqlAstTranslator<T> buildTranslator(SessionFactoryImplementor sessionFactory,
                    org.hibernate.sql.ast.tree.Statement statement) {
                return new NuriCubridSqlAstTranslator<>(sessionFactory, statement);
            }
        };
    }

    @Override
    public LockingSupport getLockingSupport() {
        return LockingSupportSimple.NO_OUTER_JOIN;
    }

    @Override
    public String getForUpdateString() {
        return " for update";
    }
}
