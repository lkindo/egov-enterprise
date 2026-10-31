package nuri.api.config;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import nuri.foundation.core.persistence.VendorSqlDialect;

/** Production/local startup cannot cross into the new writer model before the explicit database cutover. */
@Configuration
@Profile({"!test & !mock-security & !mock-security-test", "tc"})
public class AuthorizationSchemaBarrierConfig {
    @Bean
    static BeanFactoryPostProcessor authorizationBarrierDependency() {
        return factory -> {
            addDependency(factory,"entityManagerFactory","authorizationSchemaBarrier");
            addDependency(factory,"flywayInitializer","vendorProductCheck");
        };
    }

    private static void addDependency(ConfigurableListableBeanFactory factory, String bean, String dependency) {
        if (factory.containsBeanDefinition(bean)) {
            var definition=factory.getBeanDefinition(bean);
            List<String> dependencies=new ArrayList<>();
            if (definition.getDependsOn()!=null) dependencies.addAll(Arrays.asList(definition.getDependsOn()));
            dependencies.add(dependency);
            definition.setDependsOn(dependencies.toArray(String[]::new));
        }
    }

    /** 마이그레이션이 다른 제품에 닿기 전에 멈추도록 데이터베이스 초기화보다 먼저 돈다. */
    @Bean
    InitializingBean vendorProductCheck(DataSource dataSource, VendorSqlDialect vendorSql) {
        return () -> verifyVendor(new JdbcTemplate(dataSource), vendorSql);
    }

    @Bean
    @DependsOnDatabaseInitialization
    InitializingBean authorizationSchemaBarrier(DataSource dataSource, VendorSqlDialect vendorSql) {
        return () -> verify(new JdbcTemplate(dataSource), vendorSql);
    }

    /** 설정한 벤더의 SQL 을 다른 제품에 보내면 오류가 엉뚱한 곳에서 나거나 조용히 틀린다. 먼저 맞춰 본다. */
    static void verifyVendor(JdbcTemplate jdbc, VendorSqlDialect vendorSql) {
        String product=jdbc.execute((ConnectionCallback<String>) connection -> connection.getMetaData().getDatabaseProductName());
        if (product==null || !product.contains(vendorSql.databaseProductName())) {
            throw new IllegalStateException("app.database.vendor does not match the connected database: "+product);
        }
    }

    static void verify(JdbcTemplate jdbc, VendorSqlDialect vendorSql) {
        vendorSql.assertNoOpenLedgerPermit(jdbc);
        Integer legacy=jdbc.queryForObject(vendorSql.countTablesQuery(List.of("tb_user_authrt_map","tb_authrt_role_map",
                "tb_menu_crt_dtl","tb_role_prgrm_map","tb_role_hierarchy","tb_role_info")),Integer.class);
        if (legacy==null || legacy!=0) {
            throw new IllegalStateException("Authorization cutover is incomplete. Follow docs/04-operations/authorization-cutover-runbook.md before starting the new writer.");
        }
        Integer evidence=jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry WHERE chg_artcl_nm='legacy_authorization_contract' AND chg_type_cd='UPDATE'",Integer.class);
        if (evidence==null || evidence!=1) throw new IllegalStateException("Verified authorization cutover evidence is missing");
    }
}
