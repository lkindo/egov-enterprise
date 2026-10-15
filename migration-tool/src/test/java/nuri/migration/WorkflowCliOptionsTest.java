package nuri.migration;

import nuri.migration.discovery.ObjectKind;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WorkflowCliOptionsTest {

    @Test
    void acceptsOneCsvSchemasOptionAndPreservesExactAdapterId() {
        WorkflowCliOptions options = WorkflowCliOptions.parse(args(
                "--command=discover",
                "--mapping=mapping.yml",
                "--inventory=inventory.json",
                "--source-adapter=postgresql-pg-catalog",
                "--catalogs=legacy_db,archive_db",
                "--schemas=legacy,archive",
                "--object-kinds=TABLE,COLUMN",
                "--include-system-objects"));

        assertThat(options.command()).isEqualTo(WorkflowCommand.DISCOVER);
        assertThat(options.schemas()).containsExactly("legacy", "archive");
        assertThat(options.catalogs()).containsExactly("legacy_db", "archive_db");
        assertThat(options.objectKinds()).containsExactlyInAnyOrder(
                ObjectKind.TABLE, ObjectKind.COLUMN);
        assertThat(options.includeSystemObjects()).isTrue();
        assertThat(options.sourceAdapter()).isEqualTo("postgresql-pg-catalog");
    }

    @Test
    void rejectsRepeatedSchemasUnknownOptionsAndValuedAcknowledgementFlags() {
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=discover", "--mapping=m.yml", "--inventory=i.json",
                "--schemas=one", "--schemas=two")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("schemas", "한 번");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=validate", "--plan=p.json", "--unknown=value")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unknown");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=load", "--mapping=m.yml", "--inventory=i.json", "--plan=p.json",
                "--ack-source-freeze=true")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ack-source-freeze");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=discover", "--mapping=m.yml", "--inventory=i.json",
                "--object-kinds=TABLE,sentinel-private-kind")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageNotContaining("sentinel");
    }

    @Test
    void controlSchemaUpgradeAcknowledgementIsAValuelessCommitOnlyLoadFlag() {
        // [ADR-0029 L3c] 이미 있는 제어 스키마를 올리는 확인은 commit load 에서만, 값 없이 받는다.
        WorkflowCliOptions commit = WorkflowCliOptions.parse(args(
                "--command=load", "--mapping=m.yml", "--inventory=i.json", "--plan=p.json", "--mode=commit",
                "--ack-control-schema-upgrade"));
        assertThat(commit.controlSchemaUpgradeAcknowledged()).isTrue();
        assertThat(WorkflowCliOptions.parse(args(
                "--command=load", "--mapping=m.yml", "--inventory=i.json", "--plan=p.json", "--mode=commit"))
                .controlSchemaUpgradeAcknowledged()).isFalse();
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=load", "--mapping=m.yml", "--inventory=i.json", "--plan=p.json",
                "--ack-control-schema-upgrade")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("--mode=commit");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=load", "--mapping=m.yml", "--inventory=i.json", "--plan=p.json", "--mode=commit",
                "--ack-control-schema-upgrade=true")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ack-control-schema-upgrade");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=plan", "--mapping=m.yml", "--inventory=i.json", "--plan=p.json",
                "--ack-control-schema-upgrade")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unknown");
    }

    @Test
    void acceptsOrderedRepeatableExternalDriverJarsAndOptionalClassOverride() {
        Path first = Path.of("C:\\drivers\\vendor.jar");
        Path second = Path.of("C:\\drivers\\dependency.jar");

        WorkflowCliOptions options = WorkflowCliOptions.parse(args(
                "--command=discover", "--mapping=m.yml", "--inventory=i.json",
                "--source-driver-jar=" + first,
                "--source-driver-jar=" + second,
                "--source-driver-class=vendor.jdbc.Driver"));

        assertThat(options.sourceDriverJars()).containsExactly(first, second);
        assertThat(options.sourceDriverClass()).isEqualTo("vendor.jdbc.Driver");
        assertThat(options.toString())
                .doesNotContain(first.toString(), second.toString(), "vendor.jdbc.Driver");
    }

    @Test
    void rejectsDriverOptionsOutsideSourceCommandsOrClassWithoutJar() {
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=plan", "--mapping=m.yml", "--inventory=i.json", "--plan=p.json",
                "--source-driver-jar=C:\\drivers\\vendor.jar")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unknown");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=load", "--mapping=m.yml", "--inventory=i.json", "--plan=p.json",
                "--source-driver-class=vendor.jdbc.Driver")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("source-driver-jar");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=discover", "--mapping=m.yml", "--inventory=i.json",
                "--source-driver-jar=file:///sentinel/driver.jar")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageNotContaining("sentinel");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=discover", "--mapping=m.yml", "--inventory=i.json",
                "--source-driver-jar=C:\\drivers\\*.jar")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageNotContaining("drivers");
    }

    @Test
    void isolatedDriverEvidenceAcknowledgementIsExactAndNeverRendered() {
        String digest = "a".repeat(64);
        WorkflowCliOptions options = WorkflowCliOptions.parse(args(
                "--command=load", "--mapping=m.yml", "--inventory=i.json", "--plan=p.json",
                "--ack-source-driver=" + digest));

        assertThat(options.sourceDriverEvidenceAcknowledgement()).isEqualTo(digest);
        assertThat(options.toString()).doesNotContain(digest);
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=load", "--mapping=m.yml", "--inventory=i.json", "--plan=p.json",
                "--ack-source-driver=sentinel-private-driver-evidence")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageNotContaining("sentinel");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=discover", "--mapping=m.yml", "--inventory=i.json",
                "--ack-source-driver=" + digest)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unknown")
                .hasMessageNotContaining(digest);
    }

    @Test
    void theArchiveDirectoryIsALoadCommitOptionThatIsNeverRendered() {
        // [ADR-0029 L3e] 보관 디렉터리는 commit load 에서만 받는다 — dry-run 은 파일을 쓰지 않고, 다른 명령은 모른다.
        Path directory = Path.of("/srv/sentinel-private-dumps");
        WorkflowCliOptions options = WorkflowCliOptions.parse(args(
                "--command=load", "--mapping=m.yml", "--inventory=i.json", "--plan=p.json", "--mode=commit",
                "--archive-dir=" + directory));

        assertThat(options.archiveDir()).isEqualTo(directory);
        assertThat(options.toString()).doesNotContain("sentinel");
        assertThat(WorkflowCliOptions.parse(args(
                "--command=load", "--mapping=m.yml", "--inventory=i.json", "--plan=p.json", "--mode=commit"))
                .archiveDir()).isNull();
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=load", "--mapping=m.yml", "--inventory=i.json", "--plan=p.json",
                "--archive-dir=" + directory)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("--archive-dir 는 commit 에서만 씁니다 — dry-run 은 보관 파일을 쓰지 않습니다");
        assertThatThrownBy(() -> WorkflowCliOptions.parse(args(
                "--command=plan", "--mapping=m.yml", "--inventory=i.json", "--plan=p.json",
                "--archive-dir=" + directory)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unknown")
                .hasMessageNotContaining("sentinel");
    }

    private static DefaultApplicationArguments args(String... values) {
        return new DefaultApplicationArguments(values);
    }
}
