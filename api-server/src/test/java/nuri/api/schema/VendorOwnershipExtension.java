package nuri.api.schema;

import jakarta.persistence.EntityManagerFactory;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
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
 * 프로필 문자열은 환경 변수와 시험 속성에 지므로 증거가 되지 못한다. 문맥이 뜬 뒤에 봐야 하므로 첫 시험 메서드 앞에서 본다.
 */
public final class VendorOwnershipExtension implements BeforeAllCallback, BeforeEachCallback {

    private static final String REQUIRED_SCHEMA_CHECK = "validate";

    private final Set<Class<?>> checkedClasses = ConcurrentHashMap.newKeySet();

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
        String applied = String.valueOf(factory.getProperties().get("hibernate.hbm2ddl.auto"));
        String report = System.getenv("VENDOR_HIBERNATE_REPORT");
        if (report == null || report.isBlank()) {
            throw new IllegalStateException("VENDOR_HIBERNATE_REPORT 가 없다. 벤더 시험은 실행 도구로 돌린다");
        }
        Files.writeString(Path.of(report), testClass.getSimpleName() + " " + applied + System.lineSeparator(), StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        if (!REQUIRED_SCHEMA_CHECK.equals(applied)) {
            throw new IllegalStateException("Hibernate 스키마 검사가 " + applied + " 로 떴다. 벤더 실행은 validate 여야 한다 — 호스트 환경이나 시험 속성을 확인한다");
        }
    }
}
