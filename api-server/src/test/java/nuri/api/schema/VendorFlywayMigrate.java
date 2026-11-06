package nuri.api.schema;

import java.util.Arrays;
import java.util.List;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;

/**
 * 생성물의 벤더 마이그레이션을 운영과 같은 Flyway 로 적용한다({@code vendorFlywayMigrate}). 치환을 끈 것도 운영 설정과 같다.
 *
 * <p>{@code VENDOR_FLYWAY_TARGET} 이 있으면 번역 기준선까지만 적용하고 DB 에 정확히 하나가 적용됐는지 본다. 실행 도구가 그 상태에서 번역 결과와 정확 대조한다.
 * 없으면 도입자가 더한 나머지를 적용하고, 적용되지 않고 남은 마이그레이션이 없는지 본다. 남은 것은 카탈로그 시험이 보지 못한다.
 * 기준선과 나머지를 한 번에 적용하면 정확 대조가 도입자의 객체를 초과로 잡는다.
 */
public final class VendorFlywayMigrate {

    private VendorFlywayMigrate() {
    }

    public static void main(String[] args) {
        var configuration = Flyway.configure()
                .dataSource(System.getenv("VENDOR_TEST_URL"), System.getenv("SPRING_DATASOURCE_USERNAME"), System.getenv("SPRING_DATASOURCE_PASSWORD"))
                .locations(System.getenv("VENDOR_FLYWAY_LOCATION"))
                .placeholderReplacement(false);
        // 현재 스키마를 답하지 않는 드라이버(CUBRID)는 이력 표의 스키마를 실행 도구가 준다. 운영 설정의 spring.flyway.default-schema 와 같은 값이다.
        String schema = System.getenv("VENDOR_FLYWAY_DEFAULT_SCHEMA");
        if (schema != null && !schema.isBlank()) {
            configuration.defaultSchema(schema);
        }
        String target = System.getenv("VENDOR_FLYWAY_TARGET");
        if (target == null) {
            Flyway flyway = configuration.load();
            int applied = flyway.migrate().migrationsExecuted;
            // pending 만 보면 target 위에 남은 파일(Above Target)과 무시된 파일을 놓친다. 해석됐는데 적용되지 않은 것을 모두 본다.
            List<String> unapplied = Arrays.stream(flyway.info().all())
                    .filter(info -> info.getState().isResolved() && !info.getState().isApplied())
                    .map(info -> info.getScript() + "(" + info.getState().getDisplayName() + ")")
                    .toList();
            if (!unapplied.isEmpty()) {
                throw new IllegalStateException("기준선 뒤 마이그레이션이 적용되지 않고 남았다: " + String.join(", ", unapplied)
                        + ". 카탈로그 시험은 적용된 객체만 본다 — 실행 환경에 VENDOR_FLYWAY_TARGET 같은 target 이 남았는지 확인한다.");
            }
            System.out.println("[vendor-flyway] applied after the baseline: " + applied);
            return;
        }
        Flyway flyway = configuration.target(target).load();
        int applied = flyway.migrate().migrationsExecuted;
        // 이번에 적용한 수만 보면, 기준선이 이미 적용된 DB 에 기준선 뒤 버전의 target 이 다시 들어와도 그 파일 하나로 통과한다. DB 에 남은 것 전부를 센다.
        List<String> inDatabase = Arrays.stream(flyway.info().applied())
                .filter(info -> !info.getType().isSynthetic())
                .map(MigrationInfo::getScript)
                .toList();
        if (applied != 1 || inDatabase.size() != 1) {
            throw new IllegalStateException("번역 기준선 하나만 적용돼야 한다: 이번 " + applied + "개, DB 에 " + inDatabase + ". 기준선(" + target
                    + ") 뒤의 버전을 쓰는 V 파일만 더하고(R__ 는 지원하지 않는다), 기준선을 적용한 DB 에는 VENDOR_FLYWAY_TARGET 을 다시 주지 않는다.");
        }
    }
}
