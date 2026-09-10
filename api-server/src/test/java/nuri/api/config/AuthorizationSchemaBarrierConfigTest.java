package nuri.api.config;

import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.beans.factory.support.RootBeanDefinition;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthorizationSchemaBarrierConfigTest {
    private JdbcTemplate jdbc;

    @BeforeEach
    void createBarrierFixture() {
        var source=new DriverManagerDataSource("jdbc:h2:mem:barrier_"+UUID.randomUUID()
                + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","sa","");
        jdbc=new JdbcTemplate(source);
        jdbc.execute("CREATE TABLE tb_authrt_chg_hstry(chg_artcl_nm varchar(100),chg_type_cd varchar(12))");
    }

    @Test
    void permitsOnlyCompletedContractWithTheActualUpdateMarker() {
        jdbc.update("INSERT INTO tb_authrt_chg_hstry VALUES('legacy_authorization_contract','UPDATE')");
        assertThatCode(() -> AuthorizationSchemaBarrierConfig.verify(jdbc)).doesNotThrowAnyException();
    }

    @Test
    void rejectsLegacyTablesEvenWhenAnEvidenceRowExists() {
        jdbc.execute("CREATE TABLE tb_user_authrt_map(id integer)");
        jdbc.update("INSERT INTO tb_authrt_chg_hstry VALUES('legacy_authorization_contract','UPDATE')");
        assertThatThrownBy(() -> AuthorizationSchemaBarrierConfig.verify(jdbc))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("cutover is incomplete");
    }

    @Test
    void rejectsMissingWrongAndDuplicateContractMarkers() {
        assertThatThrownBy(() -> AuthorizationSchemaBarrierConfig.verify(jdbc))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("evidence is missing");
        jdbc.update("INSERT INTO tb_authrt_chg_hstry VALUES('legacy_authorization_contract','MIGRATE')");
        assertThatThrownBy(() -> AuthorizationSchemaBarrierConfig.verify(jdbc))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("evidence is missing");
        jdbc.update("INSERT INTO tb_authrt_chg_hstry VALUES('legacy_authorization_contract','UPDATE'),('legacy_authorization_contract','UPDATE')");
        assertThatThrownBy(() -> AuthorizationSchemaBarrierConfig.verify(jdbc))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("evidence is missing");
    }

    @Test
    void addsBarrierBeforeJpaWithoutLosingExistingInitializationDependencies() {
        var factory=new DefaultListableBeanFactory();
        var definition=new RootBeanDefinition(Object.class);
        definition.setDependsOn("flywayInitializer");
        factory.registerBeanDefinition("entityManagerFactory",definition);
        AuthorizationSchemaBarrierConfig.authorizationBarrierDependency().postProcessBeanFactory(factory);
        assertThat(definition.getDependsOn()).containsExactly("flywayInitializer","authorizationSchemaBarrier");
        assertThatCode(() -> AuthorizationSchemaBarrierConfig.authorizationBarrierDependency()
                .postProcessBeanFactory(new DefaultListableBeanFactory())).doesNotThrowAnyException();
    }
}
