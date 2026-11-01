package nuri.api.schema;

import org.flywaydb.core.Flyway;

/** 생성물의 번역 기준선을 운영과 같은 Flyway 로 적용한다({@code vendorFlywayMigrate}). 치환을 끈 것도 운영 설정과 같다. */
public final class VendorFlywayMigrate {

    private VendorFlywayMigrate() {
    }

    public static void main(String[] args) {
        var flyway = Flyway.configure()
                .dataSource(System.getenv("VENDOR_TEST_URL"), System.getenv("SPRING_DATASOURCE_USERNAME"), System.getenv("SPRING_DATASOURCE_PASSWORD"))
                .locations(System.getenv("VENDOR_FLYWAY_LOCATION"))
                .placeholderReplacement(false)
                .load();
        int applied = flyway.migrate().migrationsExecuted;
        if (applied != 1) {
            throw new IllegalStateException("번역 기준선 하나만 적용돼야 한다: " + applied);
        }
    }
}
