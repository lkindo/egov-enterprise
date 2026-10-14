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
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

/** [ADR-0029 L2a·L2b] 수집 명령 profile·app-scan 과 식별 명령 term-suggest 의 CLI 계약, app-scan 실행 경로. */
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
    void termSuggestReadsCollectedArtifactsAndWritesItsOwnOutputs() {
        WorkflowCliOptions options = WorkflowCliOptions.parse(args(
                "--command=term-suggest", "--mapping=mapping.yml", "--profile=profile.json",
                "--app-usage=app-usage.json", "--suggestions=suggestions.json", "--ledger-draft=draft.yml",
                "--meta-schema=std"));

        assertThat(options.command()).isEqualTo(WorkflowCommand.TERM_SUGGEST);
        assertThat(options.suggestions()).isEqualTo(Path.of("suggestions.json"));
        assertThat(options.ledgerDraft()).isEqualTo(Path.of("draft.yml"));
        assertThat(options.metaSchema()).isEqualTo("std");
        assertThat(options.inventory()).isNull();

        WorkflowCliOptions minimal = WorkflowCliOptions.parse(args(
                "--command=term-suggest", "--mapping=mapping.yml", "--profile=profile.json",
                "--suggestions=suggestions.json"));
        assertThat(minimal.appUsage()).isNull();
        assertThat(minimal.ledgerDraft()).isNull();
        assertThat(minimal.metaSchema()).isEqualTo("public");

        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=term-suggest", "--mapping=mapping.yml", "--profile=profile.json")))
                .hasMessageContaining("--suggestions is required");
        for (String[] clash : List.of(
                new String[] {"--suggestions=out.json", "--ledger-draft=./out.json"},
                new String[] {"--suggestions=profile.json"},
                new String[] {"--suggestions=s.json", "--ledger-draft=mapping.yml"},
                new String[] {"--suggestions=s.json", "--app-usage=usage.json", "--ledger-draft=usage.json"})) {
            List<String> arguments = new ArrayList<>(List.of("--command=term-suggest", "--mapping=mapping.yml",
                    "--profile=profile.json"));
            arguments.addAll(List.of(clash));
            assertThatThrownBy(() -> WorkflowCliOptions.parse(args(arguments.toArray(String[]::new))))
                    .hasMessageContaining("서로 다르고 입력 파일과도 다른 경로");
        }
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=term-suggest", "--profile=profile.json", "--suggestions=s.json")))
                .hasMessageContaining("--mapping is required");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=term-suggest", "--mapping=mapping.yml", "--suggestions=s.json")))
                .hasMessageContaining("--profile is required");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=term-suggest", "--mapping=mapping.yml", "--profile=profile.json",
                "--suggestions=s.json", "--inventory=inventory.json")))
                .hasMessageContaining("unknown workflow option");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=plan", "--mapping=m.yml", "--inventory=i.json", "--plan=p.json", "--suggestions=s.json")))
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
