package nuri.migration;

import nuri.migration.adapter.SourceAdapterRegistry;
import nuri.migration.artifact.ArtifactFileStore;
import nuri.migration.artifact.CatalogSnapshotArtifactCodec;
import nuri.migration.artifact.CollectionArtifactCodec;
import nuri.migration.artifact.MigrationPlanArtifactCodec;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.model.MappingLoader;
import nuri.migration.plan.MigrationPlanner;
import nuri.migration.postgres.PostgresTargetSchemaFingerprinter;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.validate.MappingValidator;
import nuri.migration.verify.MigrationVerifier;
import nuri.migration.workflow.WorkflowReviewLoader;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.DefaultApplicationArguments;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

/** [ADR-0029 L2a] 수집 명령 profile·app-scan 의 CLI 계약과 app-scan 실행 경로. */
class WorkflowCollectionCommandTest {

    @TempDir
    Path temp;

    @Test
    void profileTakesTheDiscoveryScopeAndItsOwnOutputButNoPlan() {
        WorkflowCliOptions options = WorkflowCliOptions.parse(args(
                "--command=profile", "--mapping=mapping.yml", "--inventory=inventory.json",
                "--profile=profile.json", "--profile-row-limit=5000", "--source-adapter=postgresql-pg-catalog",
                "--schemas=legacy"));

        assertThat(options.command()).isEqualTo(WorkflowCommand.PROFILE);
        assertThat(options.profile()).isEqualTo(Path.of("profile.json"));
        assertThat(options.profileRowLimit()).isEqualTo(5000L);
        assertThat(options.plan()).isNull();
        assertThat(options.toString()).doesNotContain("profile.json");

        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=profile", "--mapping=mapping.yml", "--inventory=inventory.json")))
                .hasMessageContaining("--profile is required");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=profile", "--mapping=mapping.yml", "--inventory=inventory.json",
                "--profile=profile.json", "--plan=plan.json")))
                .hasMessageContaining("unknown workflow option");
        for (String limit : new String[] {"0", "-1", "many"}) {
            assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                    "--command=profile", "--mapping=mapping.yml", "--inventory=inventory.json",
                    "--profile=profile.json", "--profile-row-limit=" + limit)))
                    .hasMessageContaining("1 이상의 정수");
        }
    }

    @Test
    void appScanNeedsOnlyItsSourceDirectoryAndOutput() {
        WorkflowCliOptions options = WorkflowCliOptions.parse(args(
                "--command=app-scan", "--app-source=legacy-src", "--app-usage=app-usage.json"));

        assertThat(options.command()).isEqualTo(WorkflowCommand.APP_SCAN);
        assertThat(options.appSource()).isEqualTo(Path.of("legacy-src"));
        assertThat(options.mapping()).isNull();

        assertThatThrownBy(() -> WorkflowCliOptions.parse(args("--command=app-scan", "--app-usage=out.json")))
                .hasMessageContaining("--app-source is required");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=app-scan", "--app-source=src", "--app-usage=out.json", "--mapping=mapping.yml")))
                .hasMessageContaining("unknown workflow option");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=discover", "--mapping=m.yml", "--inventory=i.json", "--profile=p.json")))
                .hasMessageContaining("unknown workflow option");
    }

    @Test
    void appScanRunsWithoutADatabaseAndWritesAReadableArtifact() throws Exception {
        Path source = Files.createDirectories(temp.resolve("legacy"));
        Files.writeString(source.resolve("Code.sql"), "SELECT CODE_NM FROM TB_CODE WHERE USE_YN = 'Y'");
        Path output = temp.resolve("app-usage.json");
        MigrationWorkflowRunner runner = runner();

        runner.run(args("--command=app-scan", "--app-source=" + source, "--app-usage=" + output));

        var envelope = new CollectionArtifactCodec().readAppUsage(Files.readString(output));
        assertThat(envelope.payload().status()).isEqualTo("COMPLETE");
        assertThat(envelope.payload().tables()).extracting(table -> table.table()).containsExactly("TB_CODE");
        assertThat(Files.readString(output)).doesNotContain(source.toString().replace('\\', '/'));
    }

    @Test
    void appScanFailureIsReportedWithoutItsCause() {
        MigrationWorkflowRunner runner = runner();

        assertThatThrownBy(() -> runner.run(args("--command=app-scan",
                "--app-source=" + temp.resolve("missing"), "--app-usage=" + temp.resolve("out.json"))))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessage("app_scan 실패 — 상세정보는 보안상 제거되었습니다.");
        assertThat(temp.resolve("out.json")).doesNotExist();
    }

    /** app-scan 은 DB·매핑을 쓰지 않는다. 나머지 협력 객체는 호출되지 않는 대역이다. */
    private static MigrationWorkflowRunner runner() {
        return new MigrationWorkflowRunner(mock(MappingLoader.class), mock(MappingValidator.class),
                mock(EtlExecutor.class), mock(MigrationVerifier.class), mock(SourceIntrospector.class),
                SourceAdapterRegistry.defaults(), new ArtifactFileStore(), new CatalogSnapshotArtifactCodec(),
                new MigrationPlanArtifactCodec(), new MigrationPlanner(), new WorkflowReviewLoader(),
                mock(PostgresTargetSchemaFingerprinter.class));
    }

    private static DefaultApplicationArguments args(String... values) {
        return new DefaultApplicationArguments(values);
    }
}
