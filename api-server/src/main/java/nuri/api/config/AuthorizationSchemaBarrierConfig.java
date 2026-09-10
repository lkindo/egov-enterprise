package nuri.api.config;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;

/** Production/local startup cannot cross into the new writer model before the explicit database cutover. */
@Configuration
@Profile({"!test & !mock-security & !mock-security-test", "tc"})
public class AuthorizationSchemaBarrierConfig {
    @Bean
    static BeanFactoryPostProcessor authorizationBarrierDependency() {
        return factory -> {
            if (factory.containsBeanDefinition("entityManagerFactory")) {
                var definition=factory.getBeanDefinition("entityManagerFactory");
                List<String> dependencies=new ArrayList<>();
                if (definition.getDependsOn()!=null) dependencies.addAll(Arrays.asList(definition.getDependsOn()));
                dependencies.add("authorizationSchemaBarrier");
                definition.setDependsOn(dependencies.toArray(String[]::new));
            }
        };
    }

    @Bean
    @DependsOnDatabaseInitialization
    InitializingBean authorizationSchemaBarrier(DataSource dataSource) {
        return () -> verify(new JdbcTemplate(dataSource));
    }

    static void verify(JdbcTemplate jdbc) {
        Integer legacy=jdbc.queryForObject("""
                SELECT count(*) FROM information_schema.tables
                WHERE table_schema='public' AND table_name IN
                 ('tb_user_authrt_map','tb_authrt_role_map','tb_menu_crt_dtl','tb_role_prgrm_map','tb_role_hierarchy','tb_role_info')
                """,Integer.class);
        if (legacy==null || legacy!=0) {
            throw new IllegalStateException("Authorization cutover is incomplete. Follow docs/04-operations/authorization-cutover-runbook.md before starting the new writer.");
        }
        Integer evidence=jdbc.queryForObject("SELECT count(*) FROM tb_authrt_chg_hstry WHERE chg_artcl_nm='legacy_authorization_contract' AND chg_type_cd='UPDATE'",Integer.class);
        if (evidence==null || evidence!=1) throw new IllegalStateException("Verified authorization cutover evidence is missing");
    }
}
