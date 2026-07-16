package nuri.migration.model;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

/** {@code mapping.yml} 파일 → {@link MappingSpec} 로드. */
@Component
public class MappingLoader {

    private final YAMLMapper yaml = YAMLMapper.builder()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
            .build();

    public MappingSpec load(Path file) {
        try {
            return yaml.readValue(Files.readAllBytes(file), MappingSpec.class);
        } catch (IOException e) {
            throw new UncheckedIOException("mapping 파일 로드 실패: " + file, e);
        }
    }
}
