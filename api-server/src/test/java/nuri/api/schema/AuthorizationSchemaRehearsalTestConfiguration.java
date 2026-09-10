package nuri.api.schema;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;

/** TC 스키마 테스트가 실제 전환 SQL을 JPA 초기화 전에 명시적으로 리허설한다. */
@TestConfiguration(proxyBeanMethods = false)
@org.springframework.context.annotation.Profile("tc")
public class AuthorizationSchemaRehearsalTestConfiguration {
    @Bean
    FlywayMigrationStrategy authorizationTestCutover(Environment environment) {
        String url=environment.getProperty("spring.datasource.url","");
        if (!url.startsWith("jdbc:tc:postgresql:17:")) {
            throw new IllegalStateException("Authorization schema rehearsal requires its disposable Testcontainers datasource");
        }
        return flyway -> {
            flyway.migrate();
            try (var connection=flyway.getConfiguration().getDataSource().getConnection()) {
                var jdbc=new org.springframework.jdbc.core.JdbcTemplate(
                        new org.springframework.jdbc.datasource.SingleConnectionDataSource(connection,true));
                Long legacy=jdbc.queryForObject("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' "
                        + "AND table_name IN ('tb_user_authrt_map','tb_authrt_role_map','tb_menu_crt_dtl','tb_role_prgrm_map','tb_role_hierarchy','tb_role_info')",Long.class);
                if (legacy!=null && legacy>0) AuthorizationCutoverTestSupport.apply(connection);
                Long marker=jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry "
                        + "WHERE chg_artcl_nm='legacy_authorization_contract' AND chg_type_cd='UPDATE'",Long.class);
                if (marker==null || marker!=1) throw new IllegalStateException("Authorization rehearsal evidence is missing");
            } catch (java.sql.SQLException | java.io.IOException failure) {
                throw new IllegalStateException("Explicit authorization schema rehearsal failed",failure);
            }
        };
    }
}
