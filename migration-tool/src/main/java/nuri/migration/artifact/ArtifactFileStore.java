package nuri.migration.artifact;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.channels.FileChannel;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.Objects;

/** 16 MiB bounded artifact를 symlink 없이 읽고 같은 디렉터리에서 atomic replace한다. */
public final class ArtifactFileStore {

    public static final int MAX_BYTES = 16 * 1024 * 1024;

    @FunctionalInterface
    interface AtomicMover {
        void move(Path source, Path target) throws IOException;
    }

    private final AtomicMover mover;

    public ArtifactFileStore() {
        this((source, target) -> Files.move(
                source, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING));
    }

    ArtifactFileStore(AtomicMover mover) {
        this.mover = Objects.requireNonNull(mover, "mover");
    }

    public String readUtf8(Path input) {
        Path path = normalized(input);
        assertNoSymbolicLinks(path);
        if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) {
            throw new IllegalArgumentException("workflow input must be a regular file");
        }
        try {
            if (Files.size(path) > MAX_BYTES) {
                throw tooLarge();
            }
            byte[] bytes;
            try (InputStream stream = Files.newInputStream(path, StandardOpenOption.READ)) {
                bytes = stream.readNBytes(MAX_BYTES + 1);
            }
            if (bytes.length > MAX_BYTES) {
                throw tooLarge();
            }
            return decodeUtf8(bytes);
        } catch (IOException failure) {
            throw new UncheckedIOException("workflow input read failed", failure);
        }
    }

    public void writeAtomic(Path output, String content) {
        Objects.requireNonNull(content, "content");
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        if (bytes.length > MAX_BYTES) {
            throw tooLarge();
        }
        Path requested = normalized(output);
        Path parent = requested.getParent();
        if (parent == null) {
            throw new IllegalArgumentException("workflow output parent directory is required");
        }
        assertNoSymbolicLinks(parent);
        if (!Files.isDirectory(parent, LinkOption.NOFOLLOW_LINKS)) {
            throw new IllegalArgumentException("workflow output parent must be a regular directory");
        }
        try {
            parent = parent.toRealPath(LinkOption.NOFOLLOW_LINKS);
        } catch (IOException failure) {
            throw new UncheckedIOException("workflow output parent resolution failed", failure);
        }
        Path path = parent.resolve(requested.getFileName());
        if (Files.exists(path, LinkOption.NOFOLLOW_LINKS)) {
            if (Files.isSymbolicLink(path)) {
                throw new IllegalArgumentException("workflow artifact symbolic link is forbidden");
            }
            if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) {
                throw new IllegalArgumentException("workflow output must be a regular file");
            }
        }

        Path temporary = null;
        try {
            temporary = Files.createTempFile(parent, ".migration-artifact-", ".tmp");
            try (FileChannel channel = FileChannel.open(
                    temporary, StandardOpenOption.WRITE, StandardOpenOption.TRUNCATE_EXISTING)) {
                ByteBuffer buffer = ByteBuffer.wrap(bytes);
                while (buffer.hasRemaining()) {
                    channel.write(buffer);
                }
                channel.force(true);
            }
            mover.move(temporary, path);
            temporary = null;
        } catch (AtomicMoveNotSupportedException failure) {
            throw new IllegalStateException("atomic artifact move is not supported");
        } catch (IOException failure) {
            throw new UncheckedIOException("atomic artifact write failed", failure);
        } finally {
            if (temporary != null) {
                try {
                    Files.deleteIfExists(temporary);
                } catch (IOException ignored) {
                    // 원래 실패 신호를 보존한다.
                }
            }
        }
    }

    private static Path normalized(Path path) {
        Objects.requireNonNull(path, "path");
        return path.toAbsolutePath().normalize();
    }

    private static void assertNoSymbolicLinks(Path path) {
        Path absolute = path.toAbsolutePath().normalize();
        Path current = absolute.getRoot();
        for (Path part : absolute) {
            current = current == null ? part : current.resolve(part);
            if (Files.exists(current, LinkOption.NOFOLLOW_LINKS) && Files.isSymbolicLink(current)) {
                throw new IllegalArgumentException("workflow artifact symbolic link is forbidden");
            }
        }
    }

    private static String decodeUtf8(byte[] bytes) {
        try {
            return StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes))
                    .toString();
        } catch (CharacterCodingException failure) {
            throw new IllegalArgumentException("workflow input must be valid UTF-8");
        }
    }

    private static IllegalArgumentException tooLarge() {
        return new IllegalArgumentException("workflow artifact exceeds the 16 MiB limit");
    }
}
