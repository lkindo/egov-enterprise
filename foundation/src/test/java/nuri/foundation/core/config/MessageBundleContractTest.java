package nuri.foundation.core.config;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Predicate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 메시지 번들 계약 — 키가 실제로 해석되는지, ko/en 이 짝을 이루는지를 소스 실측으로 고정한다.
 *
 * <p>배경: 종전에는 (1) Bean Validation 의 {@code message = "{validation.required}"} 가 어떤 번들에도
 * 연결돼 있지 않아 중괄호 리터럴이 사용자에게 노출됐고, (2) GlobalExceptionHandler 가 참조하는
 * {@code handler.*} 키 3개와 ErrorCode 2개(C014·S003)가 번들에 없어 한쪽 언어로만 응답했다.
 * 컴파일도 기존 테스트도 이를 잡지 못했다 — 누락은 예외가 아니라 <b>조용한 폴백</b>이기 때문이다.
 */
@DisplayName("메시지 번들 계약")
class MessageBundleContractTest {

    private static final String BUNDLE_DIR = "foundation/src/main/resources/egovframework/message";
    private static final List<String> MODULES = List.of("foundation", "business-core", "business-app", "api-server");

    /** 스캔 붕괴 방지 하한 — 실측 기준(2026-08-27) 이하로 떨어지면 스캐너 자체를 의심해야 한다. */
    private static final int MIN_ERROR_CODE_SOURCES = 4;
    private static final int MIN_ERROR_CODES = 39;
    private static final int MIN_HANDLER_KEYS = 7;
    private static final int MIN_BEAN_VALIDATION_REFS = 10;

    private static final Pattern ERROR_CODE = Pattern.compile("\"([A-Z]{1,3}\\d{2,3})\"\\s*,\\s*\"");
    private static final Pattern HANDLER_KEY = Pattern.compile("resolve\\(\\s*\"([a-z][a-z0-9_.]*)\"");
    private static final Pattern BEAN_VALIDATION_KEY = Pattern.compile("message\\s*=\\s*\"\\{([^}\"]+)\\}\"");
    /** Bean Validation 이 해석하지 못하는 위치 인자 자리표시자. */
    private static final Pattern POSITIONAL_PLACEHOLDER = Pattern.compile("\\{\\d+\\}");

    @AfterEach
    void resetLocale() {
        LocaleContextHolder.resetLocaleContext();
    }

    @Test
    @DisplayName("ko/en 번들의 키 집합이 정확히 일치한다 (ADR-0002 ko/en 계약)")
    void koAndEnBundlesExposeTheSameKeys() {
        Map<String, String> ko = bundle("messages_ko.properties");
        Map<String, String> en = bundle("messages_en.properties");

        Set<String> onlyInKo = new TreeSet<>(ko.keySet());
        onlyInKo.removeAll(en.keySet());
        Set<String> onlyInEn = new TreeSet<>(en.keySet());
        onlyInEn.removeAll(ko.keySet());

        assertTrue(onlyInKo.isEmpty(), "en 번들에 없는 ko 키: " + onlyInKo);
        assertTrue(onlyInEn.isEmpty(), "ko 번들에 없는 en 키: " + onlyInEn);
    }

    @Test
    @DisplayName("모든 ErrorCode 코드가 ko/en 번들에 등록돼 있다")
    void everyErrorCodeHasLocalizedMessages() {
        Map<String, String> ko = bundle("messages_ko.properties");
        Map<String, String> en = bundle("messages_en.properties");

        List<Path> sources = sourcesMatching(path -> path.getFileName().toString().endsWith("ErrorCode.java"));
        assertTrue(sources.size() >= MIN_ERROR_CODE_SOURCES,
                "ErrorCode 소스 스캔이 붕괴했다. 발견=" + sources.size() + ", 하한=" + MIN_ERROR_CODE_SOURCES);

        Set<String> codes = new TreeSet<>();
        for (Path source : sources) {
            Matcher matcher = ERROR_CODE.matcher(read(source));
            while (matcher.find()) {
                codes.add(matcher.group(1));
            }
        }
        assertTrue(codes.size() >= MIN_ERROR_CODES,
                "ErrorCode 코드 census 가 붕괴했다. 발견=" + codes.size() + ", 하한=" + MIN_ERROR_CODES);

        List<String> missing = new ArrayList<>();
        for (String code : codes) {
            if (!ko.containsKey(code)) {
                missing.add(code + " (ko)");
            }
            if (!en.containsKey(code)) {
                missing.add(code + " (en)");
            }
        }
        assertTrue(missing.isEmpty(),
                "번들에 없는 ErrorCode — 해당 로케일에서 반대 언어로 폴백한다: " + missing);
    }

    @Test
    @DisplayName("GlobalExceptionHandler 가 참조하는 메시지 키가 ko/en 번들에 모두 있다")
    void everyHandlerMessageKeyIsRegistered() {
        Map<String, String> ko = bundle("messages_ko.properties");
        Map<String, String> en = bundle("messages_en.properties");

        String handler = read(repoRoot()
                .resolve("foundation/src/main/java/nuri/foundation/core/exception/GlobalExceptionHandler.java"));

        Set<String> keys = new TreeSet<>();
        Matcher matcher = HANDLER_KEY.matcher(handler);
        while (matcher.find()) {
            keys.add(matcher.group(1));
        }
        assertTrue(keys.size() >= MIN_HANDLER_KEYS,
                "handler 키 census 가 붕괴했다. 발견=" + keys.size() + ", 하한=" + MIN_HANDLER_KEYS);

        List<String> missing = new ArrayList<>();
        for (String key : keys) {
            if (!ko.containsKey(key)) {
                missing.add(key + " (ko)");
            }
            if (!en.containsKey(key)) {
                missing.add(key + " (en)");
            }
        }
        assertTrue(missing.isEmpty(),
                "번들에 없는 handler 키 — 하드코딩된 한국어 기본값이 en 응답에도 그대로 나간다: " + missing);
    }

    @Test
    @DisplayName("Bean Validation 이 참조하는 키가 번들에 있고 위치 인자를 쓰지 않는다")
    void beanValidationKeysAreResolvableAndUsePropertyPlaceholders() {
        Map<String, Map<String, String>> bundles = new LinkedHashMap<>();
        bundles.put("ko", bundle("messages_ko.properties"));
        bundles.put("en", bundle("messages_en.properties"));

        List<Path> sources = sourcesMatching(path -> path.getFileName().toString().endsWith(".java"));
        Set<String> keys = new TreeSet<>();
        int references = 0;
        for (Path source : sources) {
            Matcher matcher = BEAN_VALIDATION_KEY.matcher(stripComments(read(source)));
            while (matcher.find()) {
                keys.add(matcher.group(1));
                references++;
            }
        }
        assertTrue(references >= MIN_BEAN_VALIDATION_REFS,
                "Bean Validation 키 참조 census 가 붕괴했다. 발견=" + references
                        + ", 하한=" + MIN_BEAN_VALIDATION_REFS);

        List<String> problems = new ArrayList<>();
        for (String key : keys) {
            for (Map.Entry<String, Map<String, String>> locale : bundles.entrySet()) {
                String value = locale.getValue().get(key);
                if (value == null) {
                    problems.add(key + " (" + locale.getKey()
                            + "): 번들에 없음 — 중괄호 리터럴이 사용자에게 그대로 노출된다");
                } else if (POSITIONAL_PLACEHOLDER.matcher(value).find()) {
                    problems.add(key + " (" + locale.getKey()
                            + "): 위치 인자 사용 — Bean Validation 은 제약 속성명만 해석한다. 값=" + value);
                }
            }
        }
        assertTrue(problems.isEmpty(), String.join("\n", problems));
    }

    @Test
    @DisplayName("설정된 Validator 가 키를 요청 로케일로 완전히 보간한다")
    void configuredValidatorInterpolatesMessagesForTheRequestLocale() {
        LocalValidatorFactoryBean validator = new EgovMessageConfig().defaultValidator();
        validator.afterPropertiesSet();

        LocaleContextHolder.setLocale(Locale.KOREAN);
        Map<String, String> korean = validate(validator, new Sample("", "a"));
        LocaleContextHolder.setLocale(Locale.ENGLISH);
        Map<String, String> english = validate(validator, new Sample("", "a"));

        assertUninterpolatedPlaceholderAbsent(korean);
        assertUninterpolatedPlaceholderAbsent(english);

        assertEquals(bundle("messages_ko.properties").get("validation.required"), korean.get("name"));
        assertEquals(bundle("messages_en.properties").get("validation.required"), english.get("name"));

        // min/max 는 제약 애노테이션 속성에서 채워진다.
        assertTrue(korean.get("code").contains("2") && korean.get("code").contains("5"),
                "min/max 가 채워지지 않았다: " + korean.get("code"));
        assertNotEquals(korean.get("code"), english.get("code"),
                "검증 메시지가 요청 로케일을 따르지 않는다 — ko/en 이 동일하다: " + korean.get("code"));
    }

    @Test
    @DisplayName("MessageSource 를 연결하지 않은 Validator 는 키를 그대로 노출한다 (회귀 대조군)")
    void validatorWithoutMessageSourceLeaksTheRawKey() {
        // Spring Boot 의 기본 배선(ValidationAutoConfiguration#defaultValidator)과 동일한 상태다.
        // 이 저장소에는 ValidationMessages.properties 가 없으므로 Hibernate Validator 는 키를
        // 해석하지 못하고 중괄호째 반환한다 — EgovMessageConfig#defaultValidator 가 막는 결함이며,
        // 이 대조군이 red 가 되면 "번들 연결이 실제로 차이를 만든다"는 전제가 깨졌다는 뜻이다.
        LocalValidatorFactoryBean plain = new LocalValidatorFactoryBean();
        plain.afterPropertiesSet();

        Map<String, String> messages = validate(plain, new Sample("", "a"));

        assertEquals("{validation.required}", messages.get("name"),
                "ValidationMessages.properties 가 새로 생겼다면 번들 SSOT 가 둘로 갈린 것이다");
        assertEquals("{validation.size}", messages.get("code"));
    }

    @Test
    @DisplayName("주석 안의 예시 표기는 참조로 세지 않는다 (스캐너 디코이 방어)")
    void commentedExamplesAreNotCountedAsReferences() {
        String source = """
                /** 문서 주석의 예시: message = "{doc.decoy}" 는 실행되지 않는다. */
                class Decoy {
                    // 줄 주석 예시: message = "{line.decoy}"
                    @NotBlank(message = "{real.key}")
                    String url = "https://example.test/a"; // 문자열 안의 // 는 주석이 아니다
                }
                """;

        Set<String> found = new TreeSet<>();
        Matcher matcher = BEAN_VALIDATION_KEY.matcher(stripComments(source));
        while (matcher.find()) {
            found.add(matcher.group(1));
        }

        assertEquals(Set.of("real.key"), found,
                "주석 디코이가 참조로 세어졌거나 실제 선언을 놓쳤다: " + found);
        assertTrue(stripComments(source).contains("https://example.test/a"),
                "문자열 리터럴 안의 // 를 주석으로 오인해 잘라냈다");
    }

    // ---------------------------------------------------------------- helpers

    /**
     * 자바 소스에서 주석만 제거한다. 문자열·문자 리터럴 안의 {@code //} 와 {@code /*} 는 보존해야
     * 하므로 단순 정규식 치환 대신 인용 상태를 추적한다.
     */
    private String stripComments(String source) {
        StringBuilder out = new StringBuilder(source.length());
        boolean inString = false;
        boolean inChar = false;
        boolean inLineComment = false;
        boolean inBlockComment = false;

        for (int i = 0; i < source.length(); i++) {
            char current = source.charAt(i);
            char next = (i + 1 < source.length()) ? source.charAt(i + 1) : '\0';

            if (inLineComment) {
                if (current == '\n') {
                    inLineComment = false;
                    out.append(current);
                }
                continue;
            }
            if (inBlockComment) {
                if (current == '*' && next == '/') {
                    inBlockComment = false;
                    i++;
                } else if (current == '\n') {
                    out.append(current); // 줄 번호를 보존한다.
                }
                continue;
            }
            if (inString) {
                out.append(current);
                if (current == '\\' && next != '\0') {
                    out.append(next);
                    i++;
                } else if (current == '"') {
                    inString = false;
                }
                continue;
            }
            if (inChar) {
                out.append(current);
                if (current == '\\' && next != '\0') {
                    out.append(next);
                    i++;
                } else if (current == '\'') {
                    inChar = false;
                }
                continue;
            }
            if (current == '/' && next == '/') {
                inLineComment = true;
                i++;
                continue;
            }
            if (current == '/' && next == '*') {
                inBlockComment = true;
                i++;
                continue;
            }
            if (current == '"') {
                inString = true;
            } else if (current == '\'') {
                inChar = true;
            }
            out.append(current);
        }
        return out.toString();
    }

    private void assertUninterpolatedPlaceholderAbsent(Map<String, String> messages) {
        assertFalse(messages.isEmpty(), "검증 위반이 하나도 수집되지 않았다 — 테스트 자체가 무력하다");
        for (Map.Entry<String, String> entry : messages.entrySet()) {
            assertFalse(entry.getValue().contains("{"),
                    "보간되지 않은 자리표시자가 남았다 — " + entry.getKey() + " = " + entry.getValue());
        }
    }

    private record Sample(@NotBlank(message = "{validation.required}") String name,
                          @Size(min = 2, max = 5, message = "{validation.size}") String code) {
    }

    private Map<String, String> validate(LocalValidatorFactoryBean validator, Sample sample) {
        Map<String, String> byProperty = new LinkedHashMap<>();
        for (ConstraintViolation<Sample> violation : validator.validate(sample)) {
            byProperty.put(violation.getPropertyPath().toString(), violation.getMessage());
        }
        return byProperty;
    }

    private Map<String, String> bundle(String fileName) {
        Path path = repoRoot().resolve(BUNDLE_DIR).resolve(fileName);
        Map<String, String> entries = new LinkedHashMap<>();
        for (String line : read(path).split("\\R")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#") || trimmed.startsWith("!")) {
                continue;
            }
            int separator = trimmed.indexOf('=');
            assertTrue(separator > 0, path.getFileName() + ": 구분자 없는 줄 — " + trimmed);
            String key = trimmed.substring(0, separator).trim();
            String previous = entries.put(key, trimmed.substring(separator + 1).trim());
            assertTrue(previous == null, path.getFileName() + ": 중복 키 — " + key);
        }
        return entries;
    }

    private List<Path> sourcesMatching(Predicate<Path> filter) {
        List<Path> found = new ArrayList<>();
        for (String module : MODULES) {
            Path root = repoRoot().resolve(module).resolve("src/main/java");
            if (!Files.isDirectory(root)) {
                continue; // 파생 제품 projection 에서 일부 모듈이 빠질 수 있다.
            }
            try (Stream<Path> paths = Files.walk(root)) {
                paths.filter(Files::isRegularFile).filter(filter).forEach(found::add);
            } catch (IOException e) {
                throw new UncheckedIOException("소스 스캔 실패: " + root, e);
            }
        }
        return found;
    }

    private String read(Path path) {
        try {
            return Files.readString(path, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("파일을 읽지 못했습니다: " + path, e);
        }
    }

    private Path repoRoot() {
        Path candidate = Paths.get("").toAbsolutePath().normalize();
        for (int i = 0; i < 6 && candidate != null; i++) {
            if (Files.isDirectory(candidate.resolve("foundation"))
                    && Files.isDirectory(candidate.resolve("business-core"))) {
                return candidate;
            }
            candidate = candidate.getParent();
        }
        throw new IllegalStateException("저장소 루트를 찾지 못했습니다 (workingDir="
                + Paths.get("").toAbsolutePath() + ")");
    }
}
