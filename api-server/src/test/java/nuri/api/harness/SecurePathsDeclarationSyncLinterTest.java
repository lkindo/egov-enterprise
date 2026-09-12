package nuri.api.harness;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.config.websocket.WebSocketCookieAuthenticationFilter;
import nuri.foundation.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.Mockito.mock;

/**
 * The former secure-path copies no longer govern access. This gate binds the reviewed operation catalog
 * to its runtime resources and verifies HTTP and SockJS authentication wiring instead.
 * MVC registration and resource-owner semantics remain covered by SecurityAuthAnnotationLinterTest.
 */
@Tag("governance-harness")
class SecurePathsDeclarationSyncLinterTest {

    private static final String POLICY = "config/governance/authorization-policies.json";
    private static final String CATALOG = "config/governance/permission-catalog.json";
    private static final String RUNTIME_BINDINGS = "business-core/src/main/resources/authorization/operation-bindings.json";
    private static final String RUNTIME_CATALOG = "business-core/src/main/resources/authorization/permission-catalog.json";
    private static final String API_CONFIG = "api-server/src/main/java/nuri/api/config/ApiSecurityConfig.java";
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @DisplayName("인가 선언 원본·런타임 생성물·실제 HTTP/SockJS 배선 동기화")
    void auditSecurePathsDeclarationsAreInSync() throws IOException {
        Path root = resolveRepoRoot();
        JsonNode source = read(root.resolve(POLICY)).path("operationBindings");
        JsonNode runtime = read(root.resolve(RUNTIME_BINDINGS));
        List<String> problems = bindingProblems(source, runtime);
        JsonNode catalog = read(root.resolve(CATALOG));
        if (!catalog.equals(read(root.resolve(RUNTIME_CATALOG)))) problems.add("permission catalog 생성물 drift");
        if (catalog.path("permissions").size() < 200) problems.add("permission catalog 하한 미달");
        String config = HarnessSourceIndex.stripCommentsPreservingStrings(
                HarnessSourceIndex.read(root.resolve(API_CONFIG))).replaceAll("\\s+", "");
        for (String token : List.of(".anyRequest().access(newnuri.business.security.authorization.OperationAuthorizationManager(",
                "WebSocketCookieAuthenticationFilter(", "JwtAuthenticationFilter.class")) {
            if (!config.contains(token)) problems.add("실제 HTTP 인증/인가 배선 소실: " + token);
        }
        var filter = new WebSocketCookieAuthenticationFilter(mock(JwtTokenProvider.class), List.of("https://app.example.test"));
        int sockJs = 0;
        for (JsonNode row : source) {
            if (!row.path("handler").asText().startsWith("EXTERNAL#") || !row.path("path").asText().startsWith("/ws")) continue;
            sockJs++;
            String path = row.path("path").asText().replaceAll("\\{[^}]+}", "segment");
            var request = new MockHttpServletRequest(row.path("method").asText(), path);
            Boolean skipped = ReflectionTestUtils.invokeMethod(filter, "shouldNotFilter", request);
            if (!Boolean.FALSE.equals(skipped) || !"AUTHENTICATED".equals(row.path("access").asText())) {
                problems.add("SockJS cookie 범위/인가 binding drift: " + row.path("method").asText() + " " + path);
            }
        }
        if (sockJs < 7) problems.add("명시적 SockJS transport coverage 하한 미달");
        for (String path : List.of("/api/v1/boards", "/ws/unknown", "/ws/segment/session/jsonp")) {
            Boolean skipped = ReflectionTestUtils.invokeMethod(filter, "shouldNotFilter", new MockHttpServletRequest("GET", path));
            if (!Boolean.TRUE.equals(skipped)) problems.add("WS cookie 인증 범위를 미등록 경로로 확대: " + path);
        }
        if (!problems.isEmpty()) fail(String.join("\n", problems));
    }

    @Test
    @DisplayName("원본/생성물 불일치·등록 삭제·중복 경로는 red")
    void injectedBindingDriftIsRejected() throws IOException {
        JsonNode source = read(resolveRepoRoot().resolve(POLICY)).path("operationBindings");
        assertTrue(bindingProblems(source, source.deepCopy()).isEmpty());
        var missing = (com.fasterxml.jackson.databind.node.ArrayNode) source.deepCopy();
        missing.remove(0);
        assertFalse(bindingProblems(source, missing).isEmpty());
        var duplicate = (com.fasterxml.jackson.databind.node.ArrayNode) source.deepCopy();
        duplicate.add(source.get(0));
        assertFalse(bindingProblems(duplicate, duplicate).isEmpty());
        var empty = mapper.createArrayNode();
        assertFalse(bindingProblems(empty, empty).isEmpty());
    }

    private static List<String> bindingProblems(JsonNode source, JsonNode runtime) {
        List<String> problems = new ArrayList<>();
        if (!source.isArray() || source.size() < 350) problems.add("operation source 하한 미달");
        if (!source.equals(runtime)) problems.add("operation runtime 생성물 drift");
        Set<String> keys = new HashSet<>();
        for (JsonNode row : source) {
            String key = row.path("method").asText() + " " + row.path("path").asText();
            if (!keys.add(key) || row.path("handler").asText().isBlank()) problems.add("중복/누락 operation: " + key);
            if (!Set.of("PUBLIC", "AUTHENTICATED", "PERMISSION", "DENY").contains(row.path("access").asText())) {
                problems.add("미등록 access: " + key);
            }
        }
        return problems;
    }

    private JsonNode read(Path path) throws IOException {
        if (!Files.isRegularFile(path)) throw new IOException("Missing authorization contract: " + path);
        return mapper.readTree(HarnessSourceIndex.read(path));
    }

    private static Path resolveRepoRoot() {
        Path cwd = Paths.get("").toAbsolutePath();
        return Files.isDirectory(cwd.resolve("api-server")) ? cwd : cwd.getParent();
    }
}
