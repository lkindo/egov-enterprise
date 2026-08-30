package nuri.migration.model;

import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Objects;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** {@code mapping.yml} 파일 → {@link MappingSpec} 로드. */
@Component
public class MappingLoader {

    private static final Pattern ENV_PLACEHOLDER = Pattern.compile("^\\$\\{([A-Z][A-Z0-9_]*)}$");

    private final YAMLMapper yaml = YAMLMapper.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true)
            .build();
    private final Function<String, String> environment;

    public MappingLoader() {
        this(System::getenv);
    }

    /** 테스트와 승인된 secret provider adapter가 동일한 fail-closed 치환 규칙을 사용한다. */
    public MappingLoader(Function<String, String> environment) {
        this.environment = Objects.requireNonNull(environment, "environment");
    }

    public MappingSpec load(Path file) {
        try {
            return parse(Files.readAllBytes(file));
        } catch (IOException e) {
            throw new UncheckedIOException("mapping 파일 로드 실패: " + file, e);
        }
    }

    /** 이미 크기·symlink·UTF-8 검증을 통과한 workflow 본문을 경로 재개방 없이 파싱한다. */
    public MappingSpec loadContent(String content) {
        Objects.requireNonNull(content, "content");
        try {
            return resolve(yaml.readValue(content, MappingSpec.class));
        } catch (IOException failure) {
            throw new IllegalArgumentException("mapping YAML parsing failed");
        }
    }

    private MappingSpec parse(byte[] content) throws IOException {
        return resolve(yaml.readValue(content, MappingSpec.class));
    }

    private MappingSpec resolve(MappingSpec raw) {
        return new MappingSpec(
                resolveDbConfig(raw.source()),
                resolveDbConfig(raw.target()),
                raw.tables(),
                raw.codemaps(),
                raw.run());
    }

    private MappingSpec.DbConfig resolveDbConfig(MappingSpec.DbConfig config) {
        if (config == null) {
            return null;
        }
        return new MappingSpec.DbConfig(
                resolveValue(config.url()),
                resolveValue(config.username()),
                resolvePassword(config.password()),
                resolveValue(config.driver()));
    }

    private String resolvePassword(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        Matcher matcher = ENV_PLACEHOLDER.matcher(value);
        if (!matcher.matches()) {
            throw new IllegalArgumentException(
                    "mapping DB password는 평문을 허용하지 않습니다. ${NAME} 전체 값 형식으로 주입하세요");
        }
        return resolveEnvironment(matcher.group(1));
    }

    private String resolveValue(String value) {
        if (value == null) {
            return null;
        }
        Matcher matcher = ENV_PLACEHOLDER.matcher(value);
        if (matcher.matches()) {
            return resolveEnvironment(matcher.group(1));
        }
        if (value.contains("${")) {
            throw new IllegalArgumentException("mapping 환경 변수는 ${NAME} 전체 값 형식만 허용합니다");
        }
        return value;
    }

    private String resolveEnvironment(String name) {
        String resolved = environment.apply(name);
        if (resolved == null || resolved.isBlank()) {
            throw new IllegalArgumentException("mapping 환경 변수 누락: " + name);
        }
        return resolved;
    }
}
