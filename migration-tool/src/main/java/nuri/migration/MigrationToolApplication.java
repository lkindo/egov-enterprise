package nuri.migration;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;

/**
 * 레거시 → 표준 스키마 데이터 이관 CLI 도구 진입점.
 *
 * <p>단일 {@code spring.datasource} 대신 mapping.yml 의 {@code source} 접속정보와
 * 타깃(표준 스키마) 접속정보를 도구가 직접 관리하므로 {@link DataSourceAutoConfiguration} 을 제외한다.
 *
 * <p>실행: {@code java -jar migration-tool.jar --mapping=mapping.yml --mode=dry-run|commit}
 * <p>설계: docs/02-architecture/legacy-migration-tool-design.md (Phase 4a)
 */
@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)
public class MigrationToolApplication {

    public static void main(String[] args) {
        SpringApplication.run(MigrationToolApplication.class, args);
    }
}
