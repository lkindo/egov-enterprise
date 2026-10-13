package nuri.migration.keymap;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 이관 도구의 표준 ID 와 온라인 앱 {@code IdGenerationUtil} 의 형식 동등성 계약(DEC-OPS-306).
 *
 * <p>migration-tool 은 실행 시 foundation 에 의존하지 않는다(DEC-OPS-005). 그래서 Gradle 의존을 더하지 않고,
 * 같은 저장소의 foundation 원본({@code IdGenerationUtil}·{@code Constants})을 시험 안에서 직접 컴파일해 두 구현이
 * 만든 ID 를 나란히 대조한다. Gradle 프로젝트 의존은 생성 제품의 "이관 모듈은 온라인 프로젝트에 의존하지 않는다"
 * 검사와 이관 단독 제품(온라인 모듈 없음)의 시험 컴파일을 깨므로 쓰지 않는다.
 *
 * <p>원본을 컴파일하므로 foundation 의 규칙이 바뀌면(예: 소문자로 되돌림, length 범위 변경) 이 시험이 붉어진다.
 * {@code scripts/ci-change-scope.mjs} 의 SHARED_ID_CONTRACT 가 두 쪽 파일 변경에 이 시험을 함께 돌린다.
 *
 * <p>의도된 차이 하나: mapping 의 {@code idStrategy.generator} 는 접두사만 주므로 이관 도구는 접두사 포함 총 20자를
 * 만든다. 온라인 앱의 20자 호출(USR_+16, ORGNZT_+13, BBSMSTR_+12)과 같지만, {@code GROUP_} 은 온라인에서
 * hex 10자리(총 16자)다. 이관한 그룹 ID 는 총 20자가 되며 컬럼 폭(varchar(20)) 안이다.
 */
@DisplayName("표준 ID 형식 — 이관 도구와 온라인 IdGenerationUtil 의 동등성")
class StandardIdGeneratorTest {

    private static final String TOOL_SOURCE =
            "migration-tool/src/main/java/nuri/migration/keymap/StandardIdGenerator.java";
    private static final String FOUNDATION_ID_SOURCE =
            "foundation/src/main/java/nuri/foundation/core/util/IdGenerationUtil.java";
    private static final String FOUNDATION_CONSTANTS_SOURCE =
            "foundation/src/main/java/nuri/foundation/constants/Constants.java";
    /** 이관 단독 제품(generate-migration-product.mjs)의 표지 — 온라인 모듈이 없다. */
    private static final String MIGRATION_PRODUCT_LOCK = "migration-product-lock.json";

    private static final List<String> PREFIXES = List.of("", "P_", "USR_", "ORGNZT_", "BBSMSTR_", "GROUP_");

    @TempDir
    static Path compiled;

    private static URLClassLoader foundationLoader;
    private static Method foundationGenerateId;
    private static Method foundationGenerateUserId;
    private static String onlineUserPrefix;
    private static int onlineUserLength;
    private static String foundationUnavailable;

    @BeforeAll
    static void compileFoundationSources() throws Exception {
        Path root = repositoryRoot();
        Path idSource = root.resolve(FOUNDATION_ID_SOURCE);
        Path constantsSource = root.resolve(FOUNDATION_CONSTANTS_SOURCE);
        if (!Files.isRegularFile(idSource) || !Files.isRegularFile(constantsSource)) {
            assertThat(root.resolve(MIGRATION_PRODUCT_LOCK))
                    .as("foundation 원본이 없는데 이관 단독 제품도 아니다 — 동등성을 증명할 수 없다")
                    .isRegularFile();
            foundationUnavailable = "이관 단독 제품에는 온라인 모듈이 없어 대조할 상대가 없다";
            return;
        }
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        assertThat(compiler).as("계약 시험은 JDK 의 javac 가 필요하다").isNotNull();
        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        try (StandardJavaFileManager files = compiler.getStandardFileManager(diagnostics, null, StandardCharsets.UTF_8)) {
            Boolean ok = compiler.getTask(null, files, diagnostics,
                    List.of("-d", compiled.toString(), "-proc:none", "-encoding", "UTF-8"), null,
                    files.getJavaFileObjects(idSource, constantsSource)).call();
            assertThat(ok).as("foundation 원본 컴파일 실패: %s", diagnostics.getDiagnostics()).isTrue();
        }
        foundationLoader = new URLClassLoader(
                new URL[] {compiled.toUri().toURL()}, ClassLoader.getPlatformClassLoader());
        Class<?> util = foundationLoader.loadClass("nuri.foundation.core.util.IdGenerationUtil");
        foundationGenerateId = util.getMethod("generateId", String.class, int.class);
        foundationGenerateUserId = util.getMethod("generateUserId");
        Class<?> user = foundationLoader.loadClass("nuri.foundation.constants.Constants$User");
        onlineUserPrefix = (String) user.getField("USER_PREFIX").get(null);
        onlineUserLength = user.getField("UUID_LENGTH").getInt(null);
    }

    @AfterAll
    static void closeFoundationLoader() throws Exception {
        if (foundationLoader != null) {
            foundationLoader.close();
        }
    }

    @Test
    @DisplayName("이관 도구는 접두사 + 대문자 hex 를 length 자리로 만든다")
    void toolEmitsPrefixedUppercaseHex() {
        for (int length = 1; length <= 32; length++) {
            assertThat(StandardIdGenerator.generate("P_", length)).matches(pattern("P_", length));
        }
        assertThat(StandardIdGenerator.generate("USR_")).matches(pattern("USR_", 16));
        assertThat(StandardIdGenerator.generate(" ORGNZT_ ")).matches(pattern("ORGNZT_", 13));
        assertThat(StandardIdGenerator.generate("A".repeat(25))).matches(pattern("A".repeat(25), 1));
        assertThat(StandardIdGenerator.generate("")).matches(pattern("", 20));
        assertThatThrownBy(() -> StandardIdGenerator.generate(null))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("prefix must not be null");
    }

    @Test
    @DisplayName("모든 길이·접두사에서 두 구현의 형식(접두사·길이·대소문자·알파벳)이 같다")
    void formatMatchesFoundationForEveryLength() throws Exception {
        requireFoundation();
        for (String prefix : PREFIXES) {
            for (int length = 1; length <= 32; length++) {
                String online = (String) foundationGenerateId.invoke(null, prefix, length);
                String tool = StandardIdGenerator.generate(prefix, length);
                Pattern expected = pattern(prefix, length);
                assertThat(online).as("온라인 형식 %s/%d", prefix, length).matches(expected);
                assertThat(tool).as("이관 도구 형식 %s/%d", prefix, length).matches(expected);
            }
        }
        // 대소문자 회귀는 정규식이 잡지만, 두 구현이 실제로 A-F 를 쓰는지(소문자로 바뀌면 사라진다)도 확인한다.
        assertThat(hexAlphabet(() -> StandardIdGenerator.generate("", 32)))
                .isEqualTo(hexAlphabet(() -> invoke(foundationGenerateId, "", 32)))
                .contains('A', 'F', '0', '9')
                .allMatch(c -> (c >= '0' && c <= '9') || (c >= 'A' && c <= 'F'));
    }

    @Test
    @DisplayName("인자 검증도 온라인과 같다 — null 접두사, 길이 0·33·음수는 IllegalArgumentException")
    void argumentValidationMatchesFoundation() {
        requireFoundation();
        assertBothReject(null, 10, "prefix must not be null");
        assertBothReject("P_", 0, "length must be in range 1..32 but was 0");
        assertBothReject("P_", 33, "length must be in range 1..32 but was 33");
        assertBothReject("P_", -1, "length must be in range 1..32 but was -1");
    }

    @Test
    @DisplayName("접두사만 주는 mapping 규칙은 온라인 사용자 ID(generateUserId)와 같은 형식이다")
    void prefixOnlyRuleMatchesOnlineUserId() throws Exception {
        requireFoundation();
        Pattern userId = pattern(onlineUserPrefix, onlineUserLength);
        assertThat((String) foundationGenerateUserId.invoke(null)).matches(userId);
        assertThat(StandardIdGenerator.generate(onlineUserPrefix)).matches(userId);
        assertThat(onlineUserPrefix.length() + onlineUserLength)
                .as("온라인 사용자 ID 총 길이가 바뀌면 mapping 기본 길이도 다시 정한다")
                .isEqualTo(StandardIdGenerator.DEFAULT_TOTAL_LENGTH);
        // 의도된 차이: 온라인 GROUP_ 은 hex 10자리(GroupManageService)지만 mapping 접두사 규칙은 총 20자다.
        assertThat(StandardIdGenerator.generate("GROUP_")).matches(pattern("GROUP_", 14));
    }

    private static void assertBothReject(String prefix, int length, String message) {
        assertThatThrownBy(() -> invoke(foundationGenerateId, prefix, length))
                .isInstanceOf(IllegalArgumentException.class).hasMessage(message);
        assertThatThrownBy(() -> StandardIdGenerator.generate(prefix, length))
                .isInstanceOf(IllegalArgumentException.class).hasMessage(message);
    }

    private static String invoke(Method method, Object... args) {
        try {
            return (String) method.invoke(null, args);
        } catch (InvocationTargetException failure) {
            if (failure.getCause() instanceof RuntimeException runtime) {
                throw runtime;
            }
            throw new IllegalStateException(failure.getCause());
        } catch (IllegalAccessException failure) {
            throw new IllegalStateException(failure);
        }
    }

    private static Set<Character> hexAlphabet(java.util.function.Supplier<String> generator) {
        Set<Character> seen = new HashSet<>();
        for (int i = 0; i < 400; i++) {
            for (char c : generator.get().toCharArray()) {
                seen.add(c);
            }
        }
        return seen;
    }

    private static Pattern pattern(String prefix, int hexLength) {
        return Pattern.compile(Pattern.quote(prefix) + "[0-9A-F]{" + hexLength + "}");
    }

    private static void requireFoundation() {
        Assumptions.assumeTrue(foundationUnavailable == null, foundationUnavailable);
    }

    private static Path repositoryRoot() {
        for (Path candidate = Path.of("").toAbsolutePath(); candidate != null; candidate = candidate.getParent()) {
            if (Files.isRegularFile(candidate.resolve(TOOL_SOURCE))) {
                return candidate;
            }
        }
        throw new IllegalStateException("저장소 루트(" + TOOL_SOURCE + ")를 찾지 못했다");
    }
}
