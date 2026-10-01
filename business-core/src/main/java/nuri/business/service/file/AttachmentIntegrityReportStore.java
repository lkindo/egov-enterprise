package nuri.business.service.file;

import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.ByteBuffer;
import java.util.Set;
import java.util.Optional;
import java.util.Map;

/** Two durable aggregate snapshots; no filenames, business identifiers, or raw errors. */
@Component
public class AttachmentIntegrityReportStore {
    private static final int HEALTH_LIMIT_BYTES = 4096;
    private final ObjectMapper mapper;
    private final Path directory;

    public AttachmentIntegrityReportStore(ObjectMapper mapper,
            @Value("${nuri.attachment.integrity.report-directory:storage/diagnostics/attachment-integrity}") String directory) {
        this.mapper = mapper;
        this.directory = Path.of(directory).toAbsolutePath().normalize();
    }

    public void save(Map<String, Object> summary, boolean completed) throws IOException {
        ensureDirectory();
        byte[] content = mapper.writeValueAsBytes(summary);
        write("latest.json", content);
        if (completed) write("last-complete.json", content);
    }

    /** Only aggregate health anchors are persisted; a malformed or linked state must be visible. */
    public Optional<HealthState> loadHealth() throws IOException {
        Path path = directory.resolve("health.json");
        if (!Files.exists(path, LinkOption.NOFOLLOW_LINKS)) return Optional.empty();
        if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) throw new IOException("Integrity health state must be a regular file");
        if (!Files.isDirectory(directory, LinkOption.NOFOLLOW_LINKS) || !directory.toRealPath().equals(directory)) {
            throw new IOException("Integrity report directory must not traverse symbolic links");
        }
        try (var channel = Files.newByteChannel(path, Set.of(StandardOpenOption.READ, LinkOption.NOFOLLOW_LINKS))) {
            if (channel.size() > HEALTH_LIMIT_BYTES) throw new IOException("Integrity health state exceeds its bound");
            var buffer = ByteBuffer.allocate(HEALTH_LIMIT_BYTES + 1);
            while (buffer.hasRemaining() && channel.read(buffer) != -1) { }
            if (buffer.position() > HEALTH_LIMIT_BYTES) throw new IOException("Integrity health state exceeds its bound");
            buffer.flip();
            byte[] content = new byte[buffer.remaining()];
            buffer.get(content);
            var tree = mapper.readTree(content);
            if (!tree.isObject() || tree.size() != 4 || !tree.path("schemaVersion").isIntegralNumber()
                    || tree.path("schemaVersion").intValue() != 1
                    || !tree.path("observedSinceEpochSeconds").isIntegralNumber() || !tree.path("observedSinceEpochSeconds").canConvertToLong()
                    || !tree.path("lastHealthyEpochSeconds").isIntegralNumber() || !tree.path("lastHealthyEpochSeconds").canConvertToLong()
                    || !tree.path("lastRunUnhealthy").isBoolean()) {
                throw new IOException("Invalid integrity health state shape");
            }
            var health = new HealthState(1, tree.path("observedSinceEpochSeconds").longValue(),
                    tree.path("lastHealthyEpochSeconds").longValue(), tree.path("lastRunUnhealthy").booleanValue());
            if (health.observedSinceEpochSeconds() < 1 || health.lastHealthyEpochSeconds() < 0
                    || health.lastHealthyEpochSeconds() != 0 && health.lastHealthyEpochSeconds() < health.observedSinceEpochSeconds()) {
                throw new IOException("Invalid integrity health state anchors");
            }
            return Optional.of(health);
        } catch (RuntimeException invalid) {
            throw new IOException("Invalid integrity health state", invalid);
        }
    }

    public void saveHealth(HealthState health) throws IOException {
        ensureDirectory();
        byte[] content = mapper.writeValueAsBytes(health);
        if (content.length > HEALTH_LIMIT_BYTES) throw new IOException("Integrity health state exceeds its bound");
        write("health.json", content);
    }

    private void ensureDirectory() throws IOException {
        Files.createDirectories(directory);
        if (!Files.isDirectory(directory, LinkOption.NOFOLLOW_LINKS) || !directory.toRealPath().equals(directory)) {
            throw new IOException("Integrity report directory must not traverse symbolic links");
        }
    }

    private void write(String name, byte[] content) throws IOException {
        Path temporary = Files.createTempFile(directory, ".scan-", ".tmp");
        try {
            Files.write(temporary, content);
            Files.move(temporary, directory.resolve(name), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } finally {
            Files.deleteIfExists(temporary);
        }
    }

    public record HealthState(int schemaVersion, long observedSinceEpochSeconds, long lastHealthyEpochSeconds,
                              boolean lastRunUnhealthy) { }
}
