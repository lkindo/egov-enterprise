package nuri.business.service.file;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;

/** Two durable aggregate snapshots; no filenames, business identifiers, or raw errors. */
@Component
public class AttachmentIntegrityReportStore {
    private final ObjectMapper mapper;
    private final Path directory;

    public AttachmentIntegrityReportStore(ObjectMapper mapper,
            @Value("${nuri.attachment.integrity.report-directory:storage/diagnostics/attachment-integrity}") String directory) {
        this.mapper = mapper;
        this.directory = Path.of(directory).toAbsolutePath().normalize();
    }

    public void save(Map<String, Object> summary, boolean completed) throws IOException {
        Files.createDirectories(directory);
        if (!Files.isDirectory(directory, LinkOption.NOFOLLOW_LINKS) || !directory.toRealPath().equals(directory)) {
            throw new IOException("Integrity report directory must not traverse symbolic links");
        }
        byte[] content = mapper.writeValueAsBytes(summary);
        write("latest.json", content);
        if (completed) write("last-complete.json", content);
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
}
