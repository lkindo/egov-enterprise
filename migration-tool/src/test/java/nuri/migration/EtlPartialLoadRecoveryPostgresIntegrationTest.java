package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingSpec;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
class EtlPartialLoadRecoveryPostgresIntegrationTest {
    @Container static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

    @Test
    void committedFirstChunkSurvivesFailureAndResumeReconcilesWithoutDuplicatingRows() {
        var endpoint = new MappingSpec.DbConfig(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(),
                POSTGRES.getPassword(), "org.postgresql.Driver");
        JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(
                endpoint.url(), endpoint.username(), endpoint.password()));
        jdbc.execute("CREATE TABLE public.legacy_resume (id bigint PRIMARY KEY, payload varchar(50))");
        jdbc.execute("INSERT INTO public.legacy_resume SELECT n, 'original' FROM generate_series(1,501) n");
        jdbc.execute("CREATE TABLE public.tb_resume (id bigint PRIMARY KEY, payload varchar(50), "
                + "CONSTRAINT ck_second_chunk CHECK (id < 501 OR payload='fixed'))");
        var table = new MappingSpec.TableMapping("public.legacy_resume", "public.tb_resume", null,
                "id", "id", List.of(
                new MappingSpec.ColumnMapping("id", "id", null, null, null, null, null),
                new MappingSpec.ColumnMapping("payload", "payload", null, null, null, null, null)), null);
        var mapping = new MappingSpec(endpoint, endpoint, List.of(table), Map.of(),
                new MappingSpec.RunContext("partial-load-drill", "synthetic-source"));
        var executor = new EtlExecutor(new SourceIntrospector(), new TransformerRegistry());
        var verifier = new MigrationVerifier();

        var partial = executor.execute(mapping, MigrationMode.COMMIT);
        assertThat(verifier.verify(mapping, partial, jdbc).ok()).isFalse();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.tb_resume", Long.class)).isEqualTo(500);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM migration_control.tb_migration_checkpoint", Long.class))
                .isEqualTo(500);

        // 실패한 행만 정정한다. 이미 커밋된 source/checkpoint는 바꾸지 않는다.
        jdbc.update("UPDATE public.legacy_resume SET payload='fixed' WHERE id=501");
        var resumed = executor.execute(mapping, MigrationMode.COMMIT);
        var resumedReport = verifier.verify(mapping, resumed, jdbc);
        assertThat(resumedReport.ok()).withFailMessage(resumedReport.toSummary()).isTrue();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM public.tb_resume", Long.class)).isEqualTo(501);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM migration_control.tb_migration_checkpoint", Long.class))
                .isEqualTo(501);
        assertThat(verifier.verify(mapping, executor.execute(mapping, MigrationMode.COMMIT), jdbc).ok()).isTrue();

        jdbc.update("UPDATE public.tb_resume SET payload='tampered' WHERE id=1");
        assertThat(verifier.verify(mapping, executor.execute(mapping, MigrationMode.COMMIT), jdbc).ok()).isFalse();
    }
}
