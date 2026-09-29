package nuri.migration;

import nuri.migration.etl.EtlExecutor;
import nuri.migration.model.MappingLoader;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.validate.MappingValidator;
import nuri.migration.verify.MigrationVerifier;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class MigrationRunnerTest {

    private final MappingLoader loader = mock(MappingLoader.class);
    private final MappingValidator validator = mock(MappingValidator.class);
    private final EtlExecutor executor = mock(EtlExecutor.class);
    private final MigrationVerifier verifier = mock(MigrationVerifier.class);
    private final SourceIntrospector introspector = mock(SourceIntrospector.class);
    private final AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();
    private MigrationRunner runner;

    @BeforeEach
    void setUp() {
        context.registerBean(MappingLoader.class, () -> loader);
        context.registerBean(MappingValidator.class, () -> validator);
        context.registerBean(EtlExecutor.class, () -> executor);
        context.registerBean(MigrationVerifier.class, () -> verifier);
        context.registerBean(SourceIntrospector.class, () -> introspector);
        context.register(MigrationRunner.class);
        context.refresh();
        runner = context.getBean(MigrationRunner.class);
    }

    @AfterEach
    void closeContext() {
        context.close();
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
        assertThatThrownBy(() -> runner.run(args(
                "--mapping=mapping.yml", "--mode=sentinel-private-mode")))
                .isInstanceOf(MigrationExecutionException.class)
                .hasNoCause()
                .hasMessageContaining("dry-run|commit")
                .hasMessageNotContaining("sentinel-private-mode");
        verify(loader, never()).load(any());
    }

    @Test
    void directCommitCannotBypassApprovedWorkflowArtifacts() {
        assertThatThrownBy(() -> runner.run(args("--mapping=mapping.yml", "--mode=commit")))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("discover", "plan", "validate", "load");
        verify(loader, never()).load(any());
        verify(executor, never()).execute(any(), any());
    }

    @Test
    void commandPresenceDisablesTheLegacyRunnerToPreventDoubleExecution() {
        assertThatCode(() -> runner.run(args(
                "--command=load", "--mapping=mapping.yml", "--inventory=i.json", "--plan=p.json")))
                .doesNotThrowAnyException();
        verify(loader, never()).load(any());
        verify(executor, never()).execute(any(), any());
    }

    @Test
    void directDryRunCannotBypassAdapterInventoryAndFreezeApprovals() {
        assertThatThrownBy(() -> runner.run(args("--mapping=mapping.yml")))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageContaining("discover", "plan", "validate", "load");

        verify(loader, never()).load(any());
        verify(introspector, never()).jdbc(any());
        verify(executor, never()).execute(any(), any());
        verify(verifier, never()).verify(any(), any(), any());
    }

    private static DefaultApplicationArguments args(String... values) {
        return new DefaultApplicationArguments(values);
    }
}
