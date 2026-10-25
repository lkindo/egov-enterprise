package nuri.migration;

import nuri.migration.adapter.SourceAdapterRegistry;
import nuri.migration.artifact.ArtifactFileStore;
import nuri.migration.artifact.CatalogSnapshotArtifactCodec;
import nuri.migration.artifact.CollectionArtifactCodec;
import nuri.migration.artifact.MigrationPlanArtifactCodec;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.generate.MappingGeneratorTest;
import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.plan.MigrationPlanner;
import nuri.migration.postgres.PostgresTargetSchemaFingerprinter;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
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

/**
 * [ADR-0029 L2a·L2b·L3a-2] 수집 명령 profile·app-scan, 식별 명령 term-suggest, 원장에서 mapping 을 만드는
 * mapping-generate 의 CLI 계약과 DB 없는 실행 경로.
 */
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
    void mappingGenerateReadsTheSkeletonLedgerAndInventoryAndWritesTheMapping() {
        WorkflowCliOptions options = WorkflowCliOptions.parse(args(
                "--command=mapping-generate", "--skeleton=skeleton.yml", "--ledger=out/ledger.yml",
                "--inventory=inventory.json", "--mapping=out/mapping.yml"));

        assertThat(options.command()).isEqualTo(WorkflowCommand.MAPPING_GENERATE);
        assertThat(options.skeleton()).isEqualTo(Path.of("skeleton.yml"));
        assertThat(options.ledger()).isEqualTo(Path.of("out/ledger.yml"));
        assertThat(options.inventory()).isEqualTo(Path.of("inventory.json"));
        assertThat(options.mapping()).isEqualTo(Path.of("out/mapping.yml"));
        assertThat(options.plan()).isNull();
        assertThat(options.toString()).doesNotContain("skeleton.yml");

        for (String missing : List.of("skeleton", "ledger", "inventory", "mapping")) {
            List<String> arguments = new ArrayList<>(List.of("--command=mapping-generate"));
            for (String option : List.of("--skeleton=s.yml", "--ledger=l.yml", "--inventory=i.json",
                    "--mapping=m.yml")) {
                if (!option.startsWith("--" + missing + "=")) {
                    arguments.add(option);
                }
            }
            assertThatThrownBy(() -> WorkflowCliOptions.parse(args(arguments.toArray(String[]::new))))
                    .hasMessageContaining("--" + missing + " is required for mapping_generate");
        }
        for (String clash : List.of("s.yml", "./l.yml", "i.json")) {
            assertThatThrownBy(() -> WorkflowCliOptions.parse(args("--command=mapping-generate",
                    "--skeleton=s.yml", "--ledger=l.yml", "--inventory=i.json", "--mapping=" + clash)))
                    .hasMessage("--mapping(만들 mapping)은 --skeleton·--ledger·--inventory 와 다른 경로여야 합니다");
        }
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args("--command=mapping-generate",
                "--skeleton=s.yml", "--ledger=l.yml", "--inventory=i.json", "--mapping=m.yml", "--plan=p.json")))
                .hasMessageContaining("unknown workflow option");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=plan", "--mapping=m.yml", "--inventory=i.json", "--plan=p.json", "--skeleton=s.yml")))
                .hasMessageContaining("unknown workflow option");
    }

    @Test
    void mappingGenerateRunsWithoutADatabaseAndShowsOnlyItsFixedRefusal() throws Exception {
        Path out = Files.createDirectories(temp.resolve("out"));
        Path skeleton = temp.resolve("skeleton.yml");
        Path ledger = out.resolve("ledger.yml");
        Path inventory = temp.resolve("inventory.json");
        Path mapping = out.resolve("mapping.yml");
        Files.writeString(skeleton, MappingGeneratorTest.SKELETON);
        Files.writeString(ledger, MappingGeneratorTest.LEDGER);
        Files.writeString(inventory, new CatalogSnapshotArtifactCodec().write(MappingGeneratorTest.inventory()));
        MigrationWorkflowRunner runner = generatingRunner();

        runner.run(args("--command=mapping-generate", "--skeleton=" + skeleton, "--ledger=" + ledger,
                "--inventory=" + inventory, "--mapping=" + mapping));

        MappingSpec generated = new MappingLoader(name -> "x").parseUnresolved(Files.readString(mapping));
        assertThat(generated.ledger().path()).isEqualTo("ledger.yml");
        assertThat(generated.tables().get(1).columns()).extracting(MappingSpec.ColumnMapping::target)
                .containsExactly("ognz_id", "frst_rgtr_id", "user_id", "user_nm", "end_ymd");
        assertThat(Files.readString(mapping)).contains("${SRC_PW}").doesNotContain("resolved-secret-");

        Path outside = temp.resolve("ledger.yml");
        Files.writeString(outside, MappingGeneratorTest.LEDGER);
        Path second = out.resolve("second.yml");
        assertThatThrownBy(() -> runner.run(args("--command=mapping-generate", "--skeleton=" + skeleton,
                "--ledger=" + outside, "--inventory=" + inventory, "--mapping=" + second)))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessage("용어 매핑 원장은 출력 mapping 과 같은 디렉터리나 그 아래에 있어야 합니다");
        Files.writeString(ledger, MappingGeneratorTest.LEDGER.replace("    load: {}\n", ""));
        assertThatThrownBy(() -> runner.run(args("--command=mapping-generate", "--skeleton=" + skeleton,
                "--ledger=" + ledger, "--inventory=" + inventory, "--mapping=" + second)))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessageStartingWith("mapping 을 만들지 않았습니다: U2: 확정에는 load");
        assertThat(second).doesNotExist();
        assertThatThrownBy(() -> runner.run(args("--command=mapping-generate", "--skeleton=" + skeleton,
                "--ledger=" + ledger, "--inventory=" + temp.resolve("missing.json"), "--mapping=" + second)))
                .isInstanceOf(MigrationExecutionException.class)
                .hasMessage("mapping_generate 실패 — 상세정보는 보안상 제거되었습니다. MW_DIAGNOSTIC=CLI_FAILED");
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
                .hasMessage("app_scan 실패 — 상세정보는 보안상 제거되었습니다. MW_DIAGNOSTIC=CLI_FAILED");
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

    /**
     * mapping-generate 는 DB 없이 mapping 검증기와 loader 만 쓴다. loader 의 환경 변수 대역은 늘 값을 돌려준다 — 생성기가
     * 접속 값을 치환해 쓰면 그 값이 드러난다.
     */
    private MigrationWorkflowRunner generatingRunner() throws Exception {
        Path columns = temp.resolve("db_columns.json");
        Files.writeString(columns, """
                [
                  {"table_name": "tb_ognz_info", "column_name": "ognz_id"},
                  {"table_name": "tb_ognz_info", "column_name": "ognz_nm"},
                  {"table_name": "tb_user_info", "column_name": "esntl_id"},
                  {"table_name": "tb_user_info", "column_name": "user_id"},
                  {"table_name": "tb_user_info", "column_name": "user_nm"},
                  {"table_name": "tb_user_info", "column_name": "end_ymd"},
                  {"table_name": "tb_user_info", "column_name": "ognz_id"},
                  {"table_name": "tb_user_info", "column_name": "frst_rgtr_id"}
                ]
                """);
        return new MigrationWorkflowRunner(new MappingLoader(name -> "resolved-secret-" + name),
                new MappingValidator(new TransformerRegistry(), columns.toString()),
                mock(EtlExecutor.class), mock(MigrationVerifier.class), mock(SourceIntrospector.class),
                SourceAdapterRegistry.defaults(), new ArtifactFileStore(), new CatalogSnapshotArtifactCodec(),
                new MigrationPlanArtifactCodec(), new MigrationPlanner(), new WorkflowReviewLoader(),
                mock(PostgresTargetSchemaFingerprinter.class));
    }

    private static DefaultApplicationArguments args(String... values) {
        return new DefaultApplicationArguments(values);
    }
}
