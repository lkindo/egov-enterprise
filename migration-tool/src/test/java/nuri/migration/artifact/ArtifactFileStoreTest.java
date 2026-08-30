package nuri.migration.artifact;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ArtifactFileStoreTest {

    @TempDir
    Path temp;

    private final ArtifactFileStore store = new ArtifactFileStore();

    @Test
    void writesAtomicallyInTheDestinationDirectoryAndReadsUtf8() throws Exception {
        Path artifact = temp.resolve("inventory.json");

        store.writeAtomic(artifact, "{\"canonical\":true}");

        assertThat(store.readUtf8(artifact)).isEqualTo("{\"canonical\":true}");
        assertThat(Files.list(temp).map(path -> path.getFileName().toString()).toList())
                .containsExactly("inventory.json");
    }

    @Test
    void rejectsOversizeAndNonRegularInputsWithoutLeakingTheRawPath() throws Exception {
        Path oversized = temp.resolve("oversized.json");
        Files.write(oversized, new byte[ArtifactFileStore.MAX_BYTES + 1]);
        Path directory = Files.createDirectory(temp.resolve("not-a-file"));

        assertThatThrownBy(() -> store.readUtf8(oversized))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("16 MiB")
                .hasMessageNotContaining(temp.toString());
        assertThatThrownBy(() -> store.readUtf8(directory))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("regular file")
                .hasMessageNotContaining(temp.toString());

        assertThatThrownBy(() -> store.writeAtomic(
                temp.resolve("too-large-output.json"),
                "x".repeat(ArtifactFileStore.MAX_BYTES + 1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("16 MiB")
                .hasMessageNotContaining(temp.toString());
    }

    @Test
    void rejectsSymbolicLinkInputsAndDestinations() throws Exception {
        Path target = temp.resolve("target.json");
        Files.writeString(target, "{}");
        Path link = temp.resolve("link.json");
        try {
            Files.createSymbolicLink(link, target.getFileName());
        } catch (IOException | UnsupportedOperationException failure) {
            Assumptions.abort("symbolic links unavailable in this environment");
        }

        assertThatThrownBy(() -> store.readUtf8(link))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("symbolic link");
        assertThatThrownBy(() -> store.writeAtomic(link, "{}"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("symbolic link");

        Path linkedParent = temp.resolve("linked-parent");
        try {
            Files.createSymbolicLink(linkedParent, temp);
        } catch (IOException | UnsupportedOperationException failure) {
            Assumptions.abort("directory symbolic links unavailable in this environment");
        }
        assertThatThrownBy(() -> store.writeAtomic(linkedParent.resolve("artifact.json"), "{}"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("symbolic link");
    }

    @Test
    void atomicMoveFailureNeverFallsBackAndAlwaysCleansTheTemporaryFile() throws Exception {
        ArtifactFileStore failing = new ArtifactFileStore((source, target) -> {
            throw new java.nio.file.AtomicMoveNotSupportedException(
                    "<redacted>", "<redacted>", "test boundary");
        });

        assertThatThrownBy(() -> failing.writeAtomic(temp.resolve("artifact.json"), "{}"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("atomic")
                .hasMessageNotContaining(temp.toString());
        assertThat(temp.resolve("artifact.json")).doesNotExist();
        assertThat(Files.list(temp)).isEmpty();
    }
}
