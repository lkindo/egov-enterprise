package nuri.api.schema;

import jakarta.persistence.EntityManagerFactory;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentHashMap;
import org.hibernate.cfg.SchemaToolingSettings;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.tool.schema.Action;
import org.hibernate.tool.schema.spi.SchemaManagementTool;
import org.hibernate.tool.schema.spi.SchemaManagementToolCoordinator.ActionGrouping;
import org.junit.jupiter.api.extension.BeforeAllCallback;
import org.junit.jupiter.api.extension.BeforeEachCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.test.context.junit.jupiter.SpringExtension;

/**
 * 벤더 실행의 모든 시험 클래스 앞에서 DB 소유를 확인한다(ADR-0047 D-10). 스프링 문맥을 띄우기 전에 돌므로 소유를 확인하지 못한 DB 에는 어떤 시험도 쓰지 않는다.
 * {@code vendorIntegrationTest} 만 자동 등록을 켠다. 다른 시험 작업에서는 돌지 않는다.
 *
 * <p>시나리오 문맥의 Hibernate 가 실제로 validate 로 떴는지도 여기서 단언하고 그 값을 실행 도구에 남긴다. 표·컬럼 부재와 타입 계열은 그 검증만 보는데,
 * 프로필 문자열은 환경 변수와 시험 속성에 지므로 증거가 되지 못한다. {@code hibernate.hbm2ddl.auto} 하나도 증거가 되지 못한다 — JPA 의 스키마 동작 키가
 * 그보다 앞선다. 그래서 Hibernate 자신의 해석기로 적용된 동작을 다시 구한다({@link #schemaCheck}). 문맥이 뜬 뒤에 봐야 하므로 첫 시험 메서드 앞에서 본다.
 */
public final class VendorOwnershipExtension implements BeforeAllCallback, BeforeEachCallback {

    /** 따로 정하지 않은 엔티티·표·시퀀스의 기여자 이름(Hibernate 7). */
    private static final String DEFAULT_CONTRIBUTOR = "orm";
    /** 기여자 접미 키가 없는 기여자(Envers 등)가 받는 루트 동작을 보려는 이름. 설정 키에 쓰이지 않는 문자라 접미 키와 겹치지 않는다. */
    private static final String ANY_CONTRIBUTOR = "\0";
    /**
     * Hibernate 가 스키마 동작을 정하는 키. 기여자 접미 키({@code 키.기여자})가 같은 키보다 먼저다. javax 두 키는 Hibernate 의 폐기 상수
     * ({@code HBM2DDL_DATABASE_ACTION}·{@code HBM2DDL_SCRIPTS_ACTION})의 값인데, 폐기 경고가 컴파일 오류라 문자열로 적는다.
     */
    private static final List<String> ACTION_KEYS = List.of(SchemaToolingSettings.HBM2DDL_AUTO,
            SchemaToolingSettings.JAKARTA_HBM2DDL_DATABASE_ACTION, "javax.persistence.schema-generation.database.action",
            SchemaToolingSettings.JAKARTA_HBM2DDL_SCRIPTS_ACTION, "javax.persistence.schema-generation.scripts.action");
    /** 스키마 관리 도구를 바꾸거나 검사할 표를 거르는 키. 있으면 validate 라는 이름만 남고 검증 범위가 달라진다. */
    private static final List<String> TOOL_KEYS = List.of(SchemaToolingSettings.SCHEMA_MANAGEMENT_TOOL, SchemaToolingSettings.HBM2DDL_FILTER_PROVIDER);
    /** Hibernate 기본 스키마 관리 도구. ServiceLoader 등록으로도 바뀌므로 설정 키와 따로 실제 서비스를 본다. */
    private static final String DEFAULT_SCHEMA_TOOL ="org.hibernate.tool.schema.internal.HibernateSchemaManagementTool";

    private final Set<Class<?>> checkedClasses = ConcurrentHashMap.newKeySet();

    /**
     * 문맥의 Hibernate 가 적용한 데이터베이스 스키마 동작과 그 검증을 막는 설정.
     *
     * @param databaseAction 기여자마다 적용된 데이터베이스 동작. 기여자마다 다르면 {@code |} 로 잇는다
     * @param problems validate 검증이 그대로 돌지 않는 이유. 비어야 통과다
     */
    public record SchemaCheck(String databaseAction, List<String> problems) {

        /** 보고서에 남길 값. 판정을 통과할 때만 적용된 동작 그대로라, 통과하지 못한 문맥은 validate 로 읽히지 않는다. */
        public String reported() {
            return problems.isEmpty() ? databaseAction : "rejected:" + databaseAction;
        }
    }

    /**
     * Hibernate 가 실제로 적용할 스키마 동작을 그 해석기({@link ActionGrouping#interpret(Set, Map)})로 다시 구한다. 시작 때 스키마 도구가 받는 설정이
     * {@code EntityManagerFactory#getProperties()} 와 같은 지도라(Hibernate 7.4 의 SessionFactoryObserverForSchemaExport) 같은 결과가 나온다.
     * 기여자마다 JPA database action(jakarta, 그다음 javax)이 hbm2ddl.auto 보다 앞서고, scripts action 만 있어도 hbm2ddl.auto 는 버려진다.
     * 모든 기여자의 데이터베이스 동작이 validate 이고 scripts action 이 없으며, 도구와 검사 범위가 기본일 때만 통과다.
     *
     * @param settings 문맥의 Hibernate 설정({@code getProperties()})
     * @param schemaTool 문맥이 실제로 쓰는 스키마 관리 도구의 클래스 이름
     */
    public static SchemaCheck schemaCheck(Map<String, ?> settings, String schemaTool) {
        Set<String> contributors = new TreeSet<>(Set.of(DEFAULT_CONTRIBUTOR, ANY_CONTRIBUTOR));
        for (String key : settings.keySet()) {
            for (String actionKey : ACTION_KEYS) {
                if (key.startsWith(actionKey + ".")) {
                    contributors.add(key.substring(actionKey.length() + 1));
                }
            }
        }
        Map<String, ActionGrouping> groupings = new HashMap<>();
        for (ActionGrouping grouping : ActionGrouping.interpret(contributors, settings)) {
            groupings.put(grouping.contributor(), grouping);
        }
        Set<String> applied = new TreeSet<>();
        List<String> problems = new ArrayList<>();
        for (String contributor : contributors) {
            ActionGrouping grouping = groupings.get(contributor);
            Action database = grouping == null ? Action.NONE : grouping.databaseAction();
            Action script = grouping == null ? Action.NONE : grouping.scriptAction();
            String who = ANY_CONTRIBUTOR.equals(contributor) ? "기여자별 키가 없는 기여자" : "기여자 " + contributor;
            applied.add(actionName(database));
            if (database != Action.VALIDATE) {
                problems.add(who + "의 데이터베이스 동작이 " + actionName(database) + " 다(JPA 의 database·scripts action 이 hibernate.hbm2ddl.auto 보다 앞선다)");
            }
            if (script != Action.NONE) {
                problems.add(who + "의 scripts action 이 " + actionName(script) + " 다(이 키가 있으면 hibernate.hbm2ddl.auto 를 보지 않는다)");
            }
        }
        for (String key : TOOL_KEYS) {
            if (settings.get(key) != null) {
                problems.add(key + " 이 스키마 관리 도구나 검사할 표를 바꾼다");
            }
        }
        if (!DEFAULT_SCHEMA_TOOL.equals(schemaTool)) {
            problems.add("스키마 관리 도구가 " + schemaTool + " 다(Hibernate 기본 도구의 검증이어야 한다)");
        }
        return new SchemaCheck(String.join("|", applied), List.copyOf(problems));
    }

    private static String actionName(Action action) {
        String name = action.getExternalHbm2ddlName();
        return name != null ? name : action.name().toLowerCase(Locale.ROOT);
    }

    @Override
    public void beforeAll(ExtensionContext context) throws SQLException {
        if (!VendorTestSql.vendorRun()) {
            throw new IllegalStateException("벤더 시험은 실행 도구로 돌린다");
        }
        try (Connection connection = VendorTestSql.openVendorConnection()) {
            VendorTestSql.assertOwnedVendorDatabase(VendorTestSql.on(connection));
        }
    }

    @Override
    public void beforeEach(ExtensionContext context) throws IOException {
        Class<?> testClass = context.getRequiredTestClass();
        if (!AnnotatedElementUtils.hasAnnotation(testClass, SpringBootTest.class) || !checkedClasses.add(testClass)) {
            return;
        }
        EntityManagerFactory factory = SpringExtension.getApplicationContext(context).getBeanProvider(EntityManagerFactory.class).getIfAvailable();
        if (factory == null) {
            return;
        }
        SchemaManagementTool tool = factory.unwrap(SessionFactoryImplementor.class).getServiceRegistry().getService(SchemaManagementTool.class);
        SchemaCheck check = schemaCheck(factory.getProperties(), tool == null ? "없음" : tool.getClass().getName());
        String report = System.getenv("VENDOR_HIBERNATE_REPORT");
        if (report == null || report.isBlank()) {
            throw new IllegalStateException("VENDOR_HIBERNATE_REPORT 가 없다. 벤더 시험은 실행 도구로 돌린다");
        }
        Files.writeString(Path.of(report), testClass.getSimpleName() + " " + check.reported() + System.lineSeparator(), StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        if (!check.problems().isEmpty()) {
            throw new IllegalStateException("Hibernate 스키마 검사가 " + check.databaseAction() + " 로 떴다. 벤더 실행은 validate 여야 한다 — "
                    + String.join("; ", check.problems()) + ". 호스트 환경이나 시험 속성을 확인한다");
        }
    }
}
