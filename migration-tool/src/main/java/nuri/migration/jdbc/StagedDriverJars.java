package nuri.migration.jdbc;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** 검증된 원본을 content hash가 같은 private temp copy로 고정해 loader TOCTOU를 줄인다. */
final class StagedDriverJars implements AutoCloseable {

    private final Path directory;
    private final List<Path> jars;
    private boolean closed;

    private StagedDriverJars(Path directory, List<Path> jars) {
        this.directory = directory;
        this.jars = List.copyOf(jars);
    }

    static StagedDriverJars stage(List<ValidatedDriverJar> validated) {
        return stage(validated, null);
    }

    static StagedDriverJars stage(List<ValidatedDriverJar> validated, Path parent) {
        Path directory = null;
        List<Path> copies = new ArrayList<>();
        try {
            directory = parent == null
                    ? Files.createTempDirectory("migration-source-driver-")
                    : Files.createTempDirectory(parent, "migration-source-driver-");
            for (int index = 0; index < validated.size(); index++) {
                ValidatedDriverJar original = validated.get(index);
                Path copy = directory.resolve("driver-%04d.jar".formatted(index));
                Files.copy(original.path(), copy);
                copies.add(copy);
                String copiedDigest = DriverJarDigests.sha256(copy);
                if (!MessageDigest.isEqual(
                        original.sha256().getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                        copiedDigest.getBytes(java.nio.charset.StandardCharsets.US_ASCII))) {
                    throw SourceDriverException.loading();
                }
                // 정책 검사와 hash 사이 원본 교체가 있어도 실제 load 바이트를 다시 검증한다.
                LocalDriverJarPolicy.validateArchive(copy);
            }
            return new StagedDriverJars(directory, copies);
        } catch (SourceDriverException failure) {
            cleanup(directory, copies);
            throw failure;
        } catch (Exception failure) {
            cleanup(directory, copies);
            throw SourceDriverException.loading();
        }
    }

    List<Path> jars() {
        return jars;
    }

    Path directory() {
        return directory;
    }

    @Override
    public void close() {
        if (closed) {
            return;
        }
        closed = true;
        if (!cleanup(directory, jars)) {
            throw SourceDriverException.cleanup();
        }
    }

    private static boolean cleanup(Path directory, List<Path> paths) {
        boolean clean = true;
        List<Path> reversed = new ArrayList<>(paths);
        Collections.reverse(reversed);
        for (Path path : reversed) {
            try {
                Files.deleteIfExists(path);
            } catch (IOException failure) {
                clean = false;
            }
        }
        if (directory != null) {
            try {
                Files.deleteIfExists(directory);
            } catch (IOException failure) {
                clean = false;
            }
        }
        return clean;
    }
}
