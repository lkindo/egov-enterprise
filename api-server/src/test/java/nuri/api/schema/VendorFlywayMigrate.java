package nuri.api.schema;

import org.flywaydb.core.Flyway;

/**
 * 생성물의 벤더 마이그레이션을 운영과 같은 Flyway 로 적용한다({@code vendorFlywayMigrate}). 치환을 끈 것도 운영 설정과 같다.
 *
 * <p>{@code VENDOR_FLYWAY_TARGET} 이 있으면 번역 기준선까지만 적용하고 정확히 하나가 적용됐는지 본다. 실행 도구가 그 상태에서 번역 결과와 정확 대조한다.
 * 없으면 도입자가 더한 나머지를 적용한다. 기준선과 나머지를 한 번에 적용하면 정확 대조가 도입자의 객체를 초과로 잡는다.
 */
public final class VendorFlywayMigrate {

    private VendorFlywayMigrate() {
    }

    public static void main(String[] args) {
        var configuration = Flyway.configure()
                .dataSource(System.getenv("VENDOR_TEST_URL"), System.getenv("SPRING_DATASOURCE_USERNAME"), System.getenv("SPRING_DATASOURCE_PASSWORD"))
                .locations(System.getenv("VENDOR_FLYWAY_LOCATION"))
                .placeholderReplacement(false);
        String target = System.getenv("VENDOR_FLYWAY_TARGET");
        if (target == null) {
            System.out.println("[vendor-flyway] applied after the baseline: " + configuration.load().migrate().migrationsExecuted);
            return;
        }
        int applied = configuration.target(target).load().migrate().migrationsExecuted;
        if (applied != 1) {
            throw new IllegalStateException("번역 기준선 하나만 적용돼야 한다: " + applied + ". 기준선(" + target + ") 뒤의 버전을 쓰는 V 파일만 더한다(R__ 는 지원하지 않는다).");
        }
    }
}
