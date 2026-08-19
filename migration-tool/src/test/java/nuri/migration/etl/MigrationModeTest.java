package nuri.migration.etl;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MigrationModeTest {

    @Test
    void parsesOnlyTheTwoDocumentedModes() {
        assertThat(MigrationMode.parse("dry-run")).isEqualTo(MigrationMode.DRY_RUN);
        assertThat(MigrationMode.parse("commit")).isEqualTo(MigrationMode.COMMIT);
        assertThatThrownBy(() -> MigrationMode.parse(null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> MigrationMode.parse(" ")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void typoCannotSilentlyDowngradeCommitToDryRun() {
        assertThatThrownBy(() -> MigrationMode.parse("comit"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("dry-run|commit");
    }
}
