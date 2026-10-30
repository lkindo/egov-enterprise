package nuri.migration.protect;

import jakarta.persistence.AttributeConverter;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.TableMapping;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;

import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;
import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 이관 도구 암호문과 온라인 주민번호 변환기의 호환 계약(DEC-OPS-308).
 *
 * <p>migration-tool 은 실행 시 foundation·business-core 에 의존하지 않는다(DEC-OPS-005). 그래서 Gradle 프로젝트 의존을
 * 더하지 않고, 같은 저장소의 온라인 원본({@code RrnoEncryptionConverter}·{@code CryptoUtil}·{@code ProjectCryptoConfig})을
 * 시험 안에서 직접 컴파일해 온라인과 같은 Spring 설정으로 돌린다. 프로젝트 의존은 생성 제품의 "이관 모듈은 온라인
 * 프로젝트에 의존하지 않는다" 검사와 이관 단독 제품의 시험 컴파일을 깨므로 쓰지 않는다(DEC-OPS-306 의 ID 계약과 같다).
 * 시험 범위 의존은 그 원본이 쓰는 외부 라이브러리(eGovFrame 암호·JPA API·Lombok)뿐이다.
 *
 * <p>원본을 컴파일하므로 온라인 쪽이 알고리즘·키 속성·인코딩·빈 값 처리를 바꾸면 이 시험이 붉어진다. 온라인
 * 엔티티의 {@code @Convert} 와 보호 목록({@link ProtectedTargetColumns})의 일치도 양방향으로 본다.
 * {@code scripts/ci-change-scope.mjs} 의 공유 계약 경로가 양쪽 변경에 이 시험을 함께 돌린다.
 */
@DisplayName("주민번호 암호문 — 이관 도구와 온라인 RrnoEncryptionConverter 의 호환")
class OnlineRrnoConverterContractTest {

    private static final String TOOL_SOURCE =
            "migration-tool/src/main/java/nuri/migration/protect/EgovAriaColumnCipher.java";
    private static final List<String> ONLINE_CRYPTO_SOURCES = List.of(
            "business-core/src/main/java/nuri/business/domain/common/RrnoEncryptionConverter.java",
            "foundation/src/main/java/nuri/foundation/core/util/CryptoUtil.java",
            "foundation/src/main/java/nuri/foundation/core/config/ProjectCryptoConfig.java");
    private static final List<String> ONLINE_SOURCE_ROOTS = List.of(
            "foundation/src/main/java", "business-core/src/main/java",
            "business-app/src/main/java", "api-server/src/main/java");
    /** 이관 단독 제품(generate-migration-product.mjs)의 표지 — 온라인 모듈이 없다. */
    private static final String MIGRATION_PRODUCT_LOCK = "migration-product-lock.json";
    /** Gradle test·PIT·단일 모듈 migrationTest 가 모두 넘기는 시험 실행 classpath. */
    private static final String TEST_CLASSPATH_PROPERTY = "migration.drill.classpath";

    /** 온라인 {@code @Convert} 변환기 → 보호 방식. 새 변환기가 생기면 이 표와 보호 목록을 함께 고친다. */
    private static final Map<String, ColumnProtection> CONVERTERS =
            Map.of("RrnoEncryptionConverter", ColumnProtection.ARIA_EGOV_V1);
    /** ADR-0046의 숫자 표현 변환은 암호화가 아니다. 새 사용처를 무조건 제외하지 않고 정확한 표·컬럼을 대조한다. */
    private static final Map<String, Set<String>> NUMERIC_CONVERTER_HOLDERS = Map.of(
            "business-core/src/main/java/nuri/business/domain/deptjob/DeptJob.java",
            Set.of("tb_dept_task_info.prrty_rnk"),
            "business-app/src/main/java/nuri/business/domain/promotion/popup/Popup.java",
            Set.of("tb_popup_info.popup_wdth_sz", "tb_popup_info.popup_vrtc_sz"));
    /** 변환기가 아니라 서비스가 암호화하는 컬럼과 그 암호 클래스. */
    private static final Map<String, String> SERVICE_ENCRYPTED = Map.of(
            "tb_auth_otp_cert.otp_secret_encpt_cn",
            "foundation/src/main/java/nuri/foundation/security/mfa/MfaSecretCipher.java");

    /**
     * 온라인 암호를 직접 부르는 원본(정의 파일 제외). 새 사용처는 보호 컬럼이 늘었다는 뜻일 수 있다 — 그 컬럼을
     * {@link #SERVICE_ENCRYPTED}·보호 목록에 더하거나 이 표에 사유와 함께 더한다.
     *
     * <p>MailDeliveryWorkHandler(ADR-0033)는 메일 접수 당시 수신주소를 암호화해 발송 작업 payload(tb_sys_job.job_cn
     * JSON 의 한 필드)에 넣고, 작업이 끝나면 payload 를 지운다. 컬럼 전체가 암호문인 것이 아니고 운영 대기열이라
     * 이관 대상이 아니므로 보호 목록에 넣지 않는다.
     */
    private static final Map<String, Set<String>> ENCRYPTION_USERS = Map.of(
            "CryptoUtil.encrypt", Set.of(
                    "business-core/src/main/java/nuri/business/domain/common/RrnoEncryptionConverter.java",
                    "business-app/src/main/java/nuri/business/service/mail/MailDeliveryWorkHandler.java"),
            "MfaSecretCipher", Set.of("business-core/src/main/java/nuri/business/service/auth/mfa/MfaSettings.java"));
    private static final Map<String, String> ENCRYPTION_DEFINITIONS = Map.of(
            "CryptoUtil.encrypt", "foundation/src/main/java/nuri/foundation/core/util/CryptoUtil.java",
            "MfaSecretCipher", "foundation/src/main/java/nuri/foundation/security/mfa/MfaSecretCipher.java");
    private static final Map<String, Pattern> ENCRYPTION_CALLS = Map.of(
            "CryptoUtil.encrypt", Pattern.compile(
                    "\\bCryptoUtil\\s*\\.\\s*encrypt\\b|import\\s+static\\s+[\\w.]*\\bCryptoUtil\\s*\\.\\s*(?:encrypt|\\*)"),
            "MfaSecretCipher", Pattern.compile("\\bMfaSecretCipher\\b"));

    /** 단순 이름·FQN({@code @jakarta.persistence.Convert}) 모두, 인자 순서와 무관하게 읽는다. */
    private static final Pattern CONVERT = Pattern.compile("@(?:jakarta\\.persistence\\.)?Convert\\s*\\(([^)]*)\\)");
    private static final Pattern CONVERTER_ARGUMENT = Pattern.compile("\\bconverter\\s*=\\s*([\\w.]+)\\.class");
    private static final Pattern CONVERSION_DISABLED = Pattern.compile("\\bdisableConversion\\s*=\\s*true\\b");
    private static final Pattern COLUMN_NAME = Pattern.compile("@Column\\s*\\(\\s*name\\s*=\\s*\"([^\"]+)\"");
    private static final Pattern TABLE_NAME = Pattern.compile("@Table\\s*\\(\\s*name\\s*=\\s*\"([^\"]+)\"");
    private static final Pattern AUTO_APPLY = Pattern.compile("@Converter\\s*\\([^)]*autoApply\\s*=\\s*true");

    /**
     * 키 절단은 UTF-16 코드 단위 32자다. 다바이트 키(32바이트를 넘는 한글)와, 32번째 코드 단위가 서로게이트 쌍을
     * 가르는 키는 바이트 단위 절단으로 바뀌면 다른 키가 된다.
     */
    private static final List<String> KEYS = List.of(
            "migration-contract-key", "k".repeat(32), "0123456789abcdef0123456789abcdefTAIL", "한글키-주민번호-2026",
            "가".repeat(20), "가".repeat(40), "a".repeat(31) + "😀tail");

    @TempDir
    static Path compiled;

    private static Path root;
    private static URLClassLoader onlineLoader;
    private static String onlineUnavailable;

    @BeforeAll
    static void compileOnlineSources() throws Exception {
        root = repositoryRoot();
        List<Path> sources = ONLINE_CRYPTO_SOURCES.stream().map(root::resolve).toList();
        if (!sources.stream().allMatch(Files::isRegularFile)) {
            assertThat(root.resolve(MIGRATION_PRODUCT_LOCK))
                    .as("온라인 암호 원본이 없는데 이관 단독 제품도 아니다 — 호환을 증명할 수 없다")
                    .isRegularFile();
            onlineUnavailable = "이관 단독 제품에는 온라인 모듈이 없어 대조할 상대가 없다";
            return;
        }
        String classpath = System.getProperty(TEST_CLASSPATH_PROPERTY);
        assertThat(classpath).as("시험 실행 classpath(%s)가 없다 — Gradle 시험 경로로 돌려야 한다", TEST_CLASSPATH_PROPERTY)
                .isNotBlank();
        String lombok = Arrays.stream(classpath.split(File.pathSeparator))
                .filter(entry -> Path.of(entry).getFileName().toString().matches("lombok-[0-9.]+\\.jar"))
                .findFirst().orElse(null);
        assertThat(lombok).as("온라인 원본은 Lombok 으로 컴파일한다 — 시험 classpath 에 lombok 이 없다").isNotNull();
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        assertThat(compiler).as("계약 시험은 JDK 의 javac 가 필요하다").isNotNull();
        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        try (StandardJavaFileManager files = compiler.getStandardFileManager(diagnostics, null, StandardCharsets.UTF_8)) {
            Boolean ok = compiler.getTask(null, files, diagnostics, List.of(
                            "-d", compiled.toString(), "-classpath", classpath, "-processorpath", lombok,
                            "-processor", "lombok.launch.AnnotationProcessorHider$AnnotationProcessor",
                            "-encoding", "UTF-8", "-nowarn"),
                    null, files.getJavaFileObjectsFromPaths(sources)).call();
            assertThat(ok).as("온라인 암호 원본 컴파일 실패: %s", diagnostics.getDiagnostics()).isTrue();
        }
        onlineLoader = new URLClassLoader(new URL[] {compiled.toUri().toURL()},
                OnlineRrnoConverterContractTest.class.getClassLoader());
    }

    @AfterAll
    static void closeOnlineLoader() throws IOException {
        if (onlineLoader != null) {
            onlineLoader.close();
        }
    }

    @Test
    @DisplayName("같은 키·값이면 두 구현의 암호문이 같고, 서로의 암호문을 되읽는다")
    void toolAndOnlineConverterProduceTheSameCiphertext() throws Exception {
        requireOnline();
        List<String> plaintexts = plaintexts();
        for (String key : KEYS) {
            EgovAriaColumnCipher tool = new EgovAriaColumnCipher(key);
            try (OnlineConverter online = OnlineConverter.start(key)) {
                for (String plaintext : plaintexts) {
                    String onlineCiphertext = online.converter().convertToDatabaseColumn(plaintext);
                    String toolCiphertext = tool.encrypt(plaintext);
                    assertThat(toolCiphertext).as("암호문 key=%d자 value=%d자", key.length(), plaintext.length())
                            .isEqualTo(onlineCiphertext);
                    assertThat(online.converter().convertToEntityAttribute(toolCiphertext)).isEqualTo(plaintext);
                    assertThat(tool.decrypt(onlineCiphertext)).isEqualTo(plaintext);
                }
            }
        }
    }

    @Test
    @DisplayName("적재 경로(ColumnProtector)의 결과를 온라인 변환기가 읽고, 빈 값은 양쪽 모두 NULL 이다")
    void loadPathOutputIsReadableOnline() throws Exception {
        requireOnline();
        String key = KEYS.getFirst();
        ColumnProtector protector = ColumnProtector.forRun(new MappingSpec(null, null, List.of(new TableMapping(
                        "LEGACY_USER", "tb_user_info", null,
                        List.of(new ColumnMapping("JUMIN", "user_enrrno", null, null, null, null, null, "aria-egov-v1")),
                        null)), Map.of()),
                name -> ColumnProtector.KEY_ENVIRONMENT.equals(name) ? key : null);
        try (OnlineConverter online = OnlineConverter.start(key)) {
            for (String rrno : List.of("800101-1234567", "8001011234567", "991231-2345678")) {
                Object written = protector.protect("tb_user_info", "user_enrrno", rrno);
                assertThat(online.converter().convertToEntityAttribute((String) written)).isEqualTo(rrno);
                assertThat(written).isEqualTo(online.converter().convertToDatabaseColumn(rrno));
            }
            for (String blank : new String[] {"", "   "}) {
                assertThat(protector.protect("tb_user_info", "user_enrrno", blank)).isNull();
                assertThat(online.converter().convertToDatabaseColumn(blank)).isNull();
            }
        }
    }

    @Test
    @DisplayName("키가 다르면 온라인 앱은 원래 값을 읽지 못한다 — 키는 앱의 ALGORITHM_KEY 와 같아야 한다")
    void aDifferentKeyIsNotReadableOnline() throws Exception {
        requireOnline();
        String toolCiphertext = new EgovAriaColumnCipher("another-migration-key").encrypt("800101-1234567");
        try (OnlineConverter online = OnlineConverter.start(KEYS.getFirst())) {
            assertThat(toolCiphertext).isNotEqualTo(online.converter().convertToDatabaseColumn("800101-1234567"));
            String readBack;
            try {
                readBack = online.converter().convertToEntityAttribute(toolCiphertext);
            } catch (IllegalStateException refused) {
                readBack = null;
            }
            assertThat(readBack).isNotEqualTo("800101-1234567");
        }
    }

    @Test
    @DisplayName("보호 목록은 온라인 엔티티의 @Convert 변환기와 서비스 암호 컬럼과 정확히 같다")
    void protectedColumnListMatchesTheOnlineEntities() throws IOException {
        requireOnline();
        Map<String, ColumnProtection> online = new TreeMap<>();
        Map<String, Set<String>> numeric = new TreeMap<>();
        Map<String, Set<String>> encryptionUsers = new TreeMap<>();
        for (Path file : onlineJavaSources()) {
            String source = Files.readString(file, StandardCharsets.UTF_8);
            String relative = root.relativize(file).toString().replace('\\', '/');
            assertThat(AUTO_APPLY.matcher(source).find())
                    .as("autoApply 변환기는 필드 선언 없이 적용돼 보호 컬럼을 셀 수 없다: %s", relative)
                    .isFalse();
            Matcher convert = CONVERT.matcher(source);
            while (convert.find()) {
                String converter = converterOf(convert.group(1));
                if (converter == null) {
                    continue; // disableConversion 은 변환기를 붙이지 않는다.
                }
                classifyConverter(converter, relative,
                        table(source, file) + "." + fieldColumn(source, convert.start(), file), online, numeric);
            }
            for (String use : encryptionUsesIn(source)) {
                if (!ENCRYPTION_DEFINITIONS.get(use).equals(relative)) {
                    encryptionUsers.computeIfAbsent(use, ignored -> new TreeSet<>()).add(relative);
                }
            }
        }
        Map<String, Set<String>> expectedNumeric = NUMERIC_CONVERTER_HOLDERS.entrySet().stream()
                // 재사용 제품은 optional 엔티티 소스 자체가 없을 수 있다. 남은 파일에서 변환기를 걷으면 여전히 red다.
                .filter(entry -> Files.isRegularFile(root.resolve(entry.getKey())))
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a, b) -> a, TreeMap::new));
        assertThat(numeric).as("비암호 숫자 변환은 승인된 파일·컬럼의 정확한 집합이어야 한다").isEqualTo(expectedNumeric);
        assertThat(encryptionUsers)
                .as("온라인 암호를 직접 부르는 원본이 바뀌었다 — 새 암호 컬럼이면 보호 목록·SERVICE_ENCRYPTED 와 함께 고친다")
                .isEqualTo(new TreeMap<>(ENCRYPTION_USERS));
        for (Map.Entry<String, String> service : SERVICE_ENCRYPTED.entrySet()) {
            assertThat(root.resolve(service.getValue())).as("서비스 암호 클래스").isRegularFile();
            String[] tableColumn = service.getKey().split("\\.");
            assertThat(entitySourceDeclares(tableColumn[0], tableColumn[1]))
                    .as("서비스 암호 컬럼이 엔티티에 있다: %s", service.getKey()).isTrue();
            online.put(service.getKey(), ColumnProtection.MFA_AES_GCM_V1);
        }

        Map<String, ColumnProtection> registry = ProtectedTargetColumns.entries().stream().collect(Collectors.toMap(
                entry -> entry.table() + "." + entry.column(), ProtectedTargetColumns.Entry::protection,
                (left, right) -> left, TreeMap::new));
        assertThat(registry).isEqualTo(online);
        assertThat(online).containsEntry("tb_user_info.user_enrrno", ColumnProtection.ARIA_EGOV_V1);
    }

    private static void classifyConverter(String converter, String source, String column,
                                          Map<String, ColumnProtection> encrypted,
                                          Map<String, Set<String>> numeric) {
        if ("IntegralStringConverter".equals(converter)) {
            assertThat(NUMERIC_CONVERTER_HOLDERS.getOrDefault(source, Set.of()))
                    .as("비암호 변환기라고 보호 컬럼을 임의 제외할 수 없다: %s %s", source, column).contains(column);
            numeric.computeIfAbsent(source, ignored -> new TreeSet<>()).add(column);
            return;
        }
        assertThat(CONVERTERS).as("새 @Convert 변환기 %s — 이관 도구 보호 목록과 이 계약을 함께 고친다", converter)
                .containsKey(converter);
        encrypted.put(column, CONVERTERS.get(converter));
    }

    @Test
    @DisplayName("숫자 변환의 명시 분류는 암호 컬럼·새 변환기를 보호 목록에서 숨기지 않는다")
    void numericConversionCannotHideProtectedOrUnknownColumns() {
        Map<String, ColumnProtection> encrypted = new TreeMap<>();
        Map<String, Set<String>> numeric = new TreeMap<>();
        String deptSource = "business-core/src/main/java/nuri/business/domain/deptjob/DeptJob.java";
        classifyConverter("IntegralStringConverter", deptSource, "tb_dept_task_info.prrty_rnk", encrypted, numeric);
        classifyConverter("RrnoEncryptionConverter", "User.java", "tb_user_info.user_enrrno", encrypted, numeric);
        assertThat(encrypted).containsOnlyKeys("tb_user_info.user_enrrno");
        assertThat(numeric.get(deptSource)).containsExactly("tb_dept_task_info.prrty_rnk");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> classifyConverter("IntegralStringConverter",
                deptSource, "tb_user_info.user_enrrno", encrypted, numeric)).isInstanceOf(AssertionError.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> classifyConverter("NewConverter",
                deptSource, "tb_dept_task_info.prrty_rnk", encrypted, numeric)).isInstanceOf(AssertionError.class);
    }

    @Test
    @DisplayName("@Convert 는 FQN·인자 순서와 무관하게 읽고, 온라인 암호 호출은 정적 import 로도 센다")
    void sourceScannersReadEveryDeclarationForm() {
        // 온라인 원본 없이도 도는 판독기 시험이다 — 판독기가 놓치면 보호 목록 대조가 조용히 줄어든다.
        String entity = """
                @jakarta.persistence.Convert(converter = nuri.x.RrnoEncryptionConverter.class)
                @Convert(attributeName = "a", converter = RrnoEncryptionConverter.class)
                @Convert(disableConversion = true)
                """;
        Matcher convert = CONVERT.matcher(entity);
        List<String> converters = new ArrayList<>();
        while (convert.find()) {
            converters.add(String.valueOf(converterOf(convert.group(1))));
        }
        assertThat(converters).containsExactly("RrnoEncryptionConverter", "RrnoEncryptionConverter", "null");
        assertThat(converterOf("attributeName = \"a\"")).as("변환기도 해제도 아니면 실패한다").isEqualTo("<unreadable>");

        assertThat(encryptionUsesIn("return CryptoUtil . encrypt(value);")).containsExactly("CryptoUtil.encrypt");
        assertThat(encryptionUsesIn("import static nuri.foundation.core.util.CryptoUtil.encrypt;"))
                .containsExactly("CryptoUtil.encrypt");
        assertThat(encryptionUsesIn("private final MfaSecretCipher cipher;")).containsExactly("MfaSecretCipher");
        assertThat(encryptionUsesIn("CryptoUtil.decrypt(value); CryptoUtilities.encrypt(x);")).isEmpty();
    }

    /** {@code @Convert(...)} 인자의 변환기 단순 이름. 해제면 null, 읽을 수 없으면 {@code <unreadable>}(대조에서 실패). */
    private static String converterOf(String arguments) {
        Matcher converter = CONVERTER_ARGUMENT.matcher(arguments);
        if (converter.find()) {
            String name = converter.group(1);
            return name.substring(name.lastIndexOf('.') + 1);
        }
        return CONVERSION_DISABLED.matcher(arguments).find() ? null : "<unreadable>";
    }

    private static Set<String> encryptionUsesIn(String source) {
        Set<String> uses = new TreeSet<>();
        ENCRYPTION_CALLS.forEach((use, pattern) -> {
            if (pattern.matcher(source).find()) {
                uses.add(use);
            }
        });
        return uses;
    }

    private static String table(String source, Path file) {
        Matcher table = TABLE_NAME.matcher(source);
        assertThat(table.find()).as("@Convert 를 쓰는 엔티티의 @Table(name) 이 없다: %s", root.relativize(file)).isTrue();
        return table.group(1);
    }

    /** {@code @Convert} 가 붙은 필드 선언(앞 문장 끝부터 다음 ';' 까지)의 {@code @Column(name)}. */
    private static String fieldColumn(String source, int convertAt, Path file) {
        int start = Math.max(Math.max(source.lastIndexOf(';', convertAt), source.lastIndexOf('{', convertAt)),
                source.lastIndexOf('}', convertAt));
        int end = source.indexOf(';', convertAt);
        Matcher column = COLUMN_NAME.matcher(source.substring(start + 1, end));
        assertThat(column.find()).as("@Convert 필드의 @Column(name) 이 없다: %s", root.relativize(file)).isTrue();
        return column.group(1);
    }

    private static boolean entitySourceDeclares(String table, String column) throws IOException {
        for (Path file : onlineJavaSources()) {
            String source = Files.readString(file, StandardCharsets.UTF_8);
            if (source.contains("@Table(name = \"" + table + "\"")
                    && source.contains("@Column(name = \"" + column + "\"")) {
                return true;
            }
        }
        return false;
    }

    private static List<Path> onlineJavaSources() throws IOException {
        List<Path> files = new ArrayList<>();
        for (String sourceRoot : ONLINE_SOURCE_ROOTS) {
            Path directory = root.resolve(sourceRoot);
            if (!Files.isDirectory(directory)) {
                continue;
            }
            try (Stream<Path> walk = Files.walk(directory)) {
                walk.filter(path -> path.toString().endsWith(".java")).sorted().forEach(files::add);
            }
        }
        assertThat(files).as("온라인 원본").isNotEmpty();
        return files;
    }

    private static List<String> plaintexts() {
        List<String> values = new ArrayList<>(List.of(
                "800101-1234567", "8001011234567", "991231-2345678", "000101-3000000",
                "가나다", "0123456789abcdef", "0123456789abcde", "0123456789abcdefg", "x"));
        Random random = new Random(20261013L);
        for (int i = 0; i < 48; i++) {
            StringBuilder value = new StringBuilder();
            int length = 1 + random.nextInt(40);
            for (int j = 0; j < length; j++) {
                value.append((char) (33 + random.nextInt(94)));
            }
            values.add(value.toString());
        }
        return values;
    }

    private static void requireOnline() {
        Assumptions.assumeTrue(onlineUnavailable == null, onlineUnavailable);
    }

    private static Path repositoryRoot() {
        for (Path candidate = Path.of("").toAbsolutePath(); candidate != null; candidate = candidate.getParent()) {
            if (Files.isRegularFile(candidate.resolve(TOOL_SOURCE))) {
                return candidate;
            }
        }
        throw new IllegalStateException("저장소 루트(" + TOOL_SOURCE + ")를 찾지 못했다");
    }

    /** 온라인과 같은 Spring 암호 설정({@code ProjectCryptoConfig})으로 키 하나를 띄운 변환기. */
    private record OnlineConverter(AnnotationConfigApplicationContext context,
                                   AttributeConverter<String, String> converter) implements AutoCloseable {

        @SuppressWarnings("unchecked")
        static OnlineConverter start(String key) throws Exception {
            AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();
            context.setClassLoader(onlineLoader);
            context.getEnvironment().getPropertySources().addFirst(new MapPropertySource(
                    "rrno-contract", Map.of("Globals.File.algorithmKey", key)));
            context.register(onlineLoader.loadClass("nuri.foundation.core.config.ProjectCryptoConfig"));
            context.refresh();
            // CryptoUtil 은 키와 암호 서비스를 static 으로 둔다 — 이 문맥이 마지막으로 띄운 키가 쓰인다.
            Object converter = onlineLoader.loadClass("nuri.business.domain.common.RrnoEncryptionConverter")
                    .getDeclaredConstructor().newInstance();
            return new OnlineConverter(context, (AttributeConverter<String, String>) converter);
        }

        @Override
        public void close() {
            context.close();
        }
    }
}
