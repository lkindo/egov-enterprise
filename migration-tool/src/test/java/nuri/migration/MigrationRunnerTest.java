package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.etl.MigrationMode;
import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.validate.MappingValidator;
import nuri.migration.validate.ValidationResult;
import nuri.migration.verify.MigrationReport;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class MigrationRunnerTest {

    private final MappingLoader loader = mock(MappingLoader.class);
    private final MappingValidator validator = mock(MappingValidator.class);
    private final EtlExecutor executor = mock(EtlExecutor.class);
    private final MigrationVerifier verifier = mock(MigrationVerifier.class);
    private final SourceIntrospector introspector = mock(SourceIntrospector.class);
    private final MigrationRunner runner = new MigrationRunner(loader, validator, executor, verifier, introspector);
    private final JdbcTemplate sourceJdbc = mock(JdbcTemplate.class);

    private MappingSpec spec;
    private List<EtlExecutor.TableResult> results;

    @BeforeEach
    void setUp() {
        DbConfig source = new DbConfig("jdbc:h2:mem:source", "sa", "", "org.h2.Driver");
        DbConfig target = new DbConfig("jdbc:h2:mem:target", "sa", "", "org.h2.Driver");
        TableMapping table = new TableMapping("legacy_user", "tb_user_info", null,
                List.of(new ColumnMapping("name", "user_nm", null, null, null, null, null)), null);
        spec = new MappingSpec(source, target, List.of(table), Map.of());
        results = List.of(new EtlExecutor.TableResult("legacy_user", "tb_user_info", 1, 1, 0, List.of()));

        given(loader.load(any(Path.class))).willReturn(spec);
        given(validator.validate(spec)).willReturn(new ValidationResult(List.of(), List.of()));
        given(introspector.jdbc(spec.source())).willReturn(sourceJdbc);
        given(validator.validateLiveSource(spec, sourceJdbc))
                .willReturn(new ValidationResult(List.of(), List.of()));
        given(executor.execute(spec, MigrationMode.DRY_RUN)).willReturn(results);
        given(verifier.verify(spec, results, null)).willReturn(
                new MigrationReport(List.of(), MigrationReport.Status.PASS));
    }

    @Test
    void missingMappingIsAProcessFailureSignal() {
        assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("--mapping");
        verify(executor, never()).execute(any(), any());
    }

    @Test
    void invalidModeCannotBecomeDryRun() {
        assertThatThrownBy(() -> runner.run(args("--mapping=mapping.yml", "--mode=comit")))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("dry-run|commit");
        verify(loader, never()).load(any());
    }

    @Test
    void validationErrorsAreThrownPastApplicationRunner() {
        given(validator.validate(spec)).willReturn(new ValidationResult(List.of("ghost column"), List.of()));

        assertThatThrownBy(() -> runner.run(args("--mapping=mapping.yml")))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("매핑 검증 실패");
        verify(executor, never()).execute(any(), any());
    }

    @Test
    void commitWithoutTargetCannotSilentlyRunAsDryRun() {
        MappingSpec noTarget = new MappingSpec(spec.source(), null, spec.tables(), spec.codemaps());
        given(loader.load(any(Path.class))).willReturn(noTarget);

        assertThatThrownBy(() -> runner.run(args("--mapping=mapping.yml", "--mode=commit")))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("mapping.target");
        verify(executor, never()).execute(any(), any());
    }

    @Test
    void commitFailsBeforeWriteWhenLiveTargetSchemaDoesNotMatch() {
        JdbcTemplate target = mock(JdbcTemplate.class);
        given(introspector.jdbc(spec.target())).willReturn(target);
        given(validator.validateLiveTarget(spec, target))
                .willReturn(new ValidationResult(List.of("missing live column"), List.of()));

        assertThatThrownBy(() -> runner.run(args("--mapping=mapping.yml", "--mode=commit")))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("실 target schema 검증 실패");
        verify(executor, never()).execute(any(), any());
    }

    @Test
    void liveSourceSchemaFailureStopsBeforeAnyTargetWritePath() {
        given(validator.validateLiveSource(spec, sourceJdbc))
                .willReturn(new ValidationResult(List.of("missing source key"), List.of()));

        assertThatThrownBy(() -> runner.run(args("--mapping=mapping.yml", "--mode=commit")))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("실 source schema 검증 실패");

        verify(introspector, never()).jdbc(spec.target());
        verify(executor, never()).execute(any(), any());
    }

    @Test
    void failReportBecomesANonZeroCapableException() {
        given(verifier.verify(spec, results, null)).willReturn(
                new MigrationReport(List.of(), MigrationReport.Status.FAIL));

        assertThatThrownBy(() -> runner.run(args("--mapping=mapping.yml")))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("결과 검증 실패");
    }

    @Test
    void warnReportIsAlsoANonZeroCapableStrictFailure() {
        given(verifier.verify(spec, results, null)).willReturn(
                new MigrationReport(List.of(), MigrationReport.Status.WARN));

        assertThatThrownBy(() -> runner.run(args("--mapping=mapping.yml")))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("결과 검증 실패(WARN)");
    }

    @Test
    void passingDryRunCompletesNormally() {
        assertThatCode(() -> runner.run(args("--mapping=mapping.yml"))).doesNotThrowAnyException();
    }

    private static DefaultApplicationArguments args(String... values) {
        return new DefaultApplicationArguments(values);
    }
}
