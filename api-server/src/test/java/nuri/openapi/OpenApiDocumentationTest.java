package nuri.openapi;

import nuri.api.support.ApiHttpIntegrationTest;
import nuri.foundation.security.filter.CredentialRequestTargetPolicy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.hamcrest.Matchers.hasItem;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * OpenAPI 문서화 테스트
 * API 문서화 생성 및 검증
 */
@ApiHttpIntegrationTest
@org.springframework.test.context.TestPropertySource(properties = {
    "springdoc.api-docs.enabled=true",
    "springdoc.swagger-ui.enabled=true",
    // [W1-15] `src/test/resources/application.yml` 이 main 을 shadow 하므로, main 에 선언한 springdoc
    //   설정은 이 컨텍스트에 도달하지 못한다 — 산출 api-docs.json 이 런타임 스펙과 달라진다.
    //   @TestPropertySource 는 그 shadow 보다 우선하므로 여기서 다시 못박는다.
    //   ⚠ main application.yml 의 springdoc 블록과 반드시 동일하게 유지할 것.
    "springdoc.default-flat-param-object=true"
})
class OpenApiDocumentationTest {

  private static final java.util.Set<String> HTTP_METHODS = java.util.Set.of(
      "get", "put", "post", "delete", "options", "head", "patch", "trace");
  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private tools.jackson.databind.ObjectMapper objectMapper;

  @Test
  @DisplayName("Swagger UI 엔드포인트 접근성 확인")
  void swaggerUi_endpoint_accessibility() throws Exception {
    // When & Then - Swagger UI 엔드포인트 확인
    mockMvc.perform(get("/swagger-ui/index.html")
        .contentType(MediaType.TEXT_HTML))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("OpenAPI 스펙 JSON 생성 확인")
  void openApiSpec_endpoint_accessibility() throws Exception {
    // When & Then - OpenAPI 스펙 확인
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.openapi").exists())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);

    String exportPath = System.getProperty("openapi.export.path");
    if (exportPath != null && !exportPath.isEmpty()) {
      java.nio.file.Path path = java.nio.file.Paths.get(exportPath);
      if (path.getParent() != null) {
        java.nio.file.Files.createDirectories(path.getParent());
      }
      java.nio.file.Files.writeString(path, normalizeForCommit(content),
          java.nio.charset.StandardCharsets.UTF_8);
    }
  }

  @Test
  @DisplayName("서버 URL 과 경로를 이어 붙여도 API 기본 경로가 한 번만 나온다")
  void serverUrls_doNotRepeatThePathPrefix() throws Exception {
    tools.jackson.databind.JsonNode spec = objectMapper.readTree(mockMvc.perform(get("/v3/api-docs"))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
    assertThat(spec.path("servers").isArray() && !spec.path("servers").isEmpty())
        .as("서버 목록이 없으면 이 검사가 무의미해진다").isTrue();
    java.util.List<String> paths = new java.util.ArrayList<>(spec.path("paths").propertyNames());
    assertThat(paths).as("문서화된 경로가 없다").isNotEmpty();

    java.util.List<String> doubled = new java.util.ArrayList<>();
    for (tools.jackson.databind.JsonNode server : spec.path("servers")) {
      String url = server.path("url").asString();
      String basePath = java.net.URI.create(url).getPath().replaceAll("/+$", "");
      if (basePath.isEmpty()) {
        continue;
      }
      paths.stream().filter(path -> path.startsWith(basePath + "/")).findFirst()
          .ifPresent(path -> doubled.add(url + " + " + path));
    }
    assertThat(doubled)
        .as("OpenAPI 는 서버 URL 뒤에 경로를 붙여 호출한다 — 경로에 이미 있는 기본 경로를 서버 URL 에 두면 두 번 붙는다")
        .isEmpty();
  }

  @Test
  @DisplayName("사용자 권한 LEFT JOIN projection은 실제 null 생산 필드를 nullable로 문서화한다")
  void generatedResponseNullabilityContract_isDocumented() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);

    tools.jackson.databind.JsonNode schemas =
        tools.jackson.databind.json.JsonMapper.builder().configureForJackson2().build().readTree(content)
            .path("components").path("schemas");
    assertNullableProperties(schemas.path("AuthorGroupProjection"),
        "groupId", "mberTyNm", "authrtId");
    assertNullableProperties(schemas.path("DeptAuthorProjection"), "authrtId");
  }

  @Test
  @DisplayName("User/Auth의 실제 JSON null 생략 방식과 OpenAPI optional non-null 계약이 일치한다")
  void generatedUserJsonNullabilityContract_matchesRuntimeSerialization() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    tools.jackson.databind.JsonNode schemas = objectMapper.readTree(content)
        .path("components").path("schemas");

    nuri.business.service.user.dto.UserDto user =
        nuri.business.service.user.dto.UserDto.builder()
            .userId("user01")
            .userNm("홍길동")
            .build();
    tools.jackson.databind.JsonNode userJson = objectMapper.valueToTree(user);
    assertThat(userJson.has("esntlId"))
        .as("UserDto optional non-null schema requires null-valued response fields to be absent")
        .isFalse();
    assertThat(userJson.has("emlAddr")).isFalse();
    assertThat(isNullableSchema(schemas.path("UserDto").path("properties").path("esntlId")))
        .isFalse();

    nuri.api.controller.foundation.auth.dto.CurrentUserResponse currentUser =
        new nuri.api.controller.foundation.auth.dto.CurrentUserResponse(
            "user01", null, "홍길동", null, null, null);
    tools.jackson.databind.JsonNode currentUserJson = objectMapper.valueToTree(currentUser);
    assertThat(currentUserJson.has("esntlId"))
        .as("CurrentUserResponse optional non-null schema requires null-valued fields to be absent")
        .isFalse();
    assertThat(currentUserJson.has("role")).isFalse();
    assertThat(currentUserJson.has("userSe")).isFalse();
    assertThat(currentUserJson.has("email")).isFalse();
  }

  @Test
  @DisplayName("조직 계층 일괄 저장은 전용 최소 요청 계약을 문서화한다")
  void departmentHierarchyRequestContract_isDocumented() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    tools.jackson.databind.JsonNode document =
        tools.jackson.databind.json.JsonMapper.builder().configureForJackson2().build().readTree(content);
    tools.jackson.databind.JsonNode itemSchema = document.path("paths")
        .path("/api/v1/admin/system/departments/batch-hierarchy")
        .path("put").path("requestBody").path("content").path("application/json")
        .path("schema").path("items");
    String reference = itemSchema.path("$ref").asString();
    String schemaName = reference.substring(reference.lastIndexOf('/') + 1);
    tools.jackson.databind.JsonNode schema =
        document.path("components").path("schemas").path(schemaName);

    assertThat(schema.path("properties").propertyStream().map(java.util.Map.Entry::getKey).toList())
        .containsExactlyInAnyOrder("ognzId", "upOgnzId", "sortOrdr");
    assertThat(schema.path("required").valueStream()
        .map(tools.jackson.databind.JsonNode::asString).toList())
        .contains("ognzId");
    assertThat(schema.path("properties").has("ognzNm")).isFalse();
  }



  @Test
  @DisplayName("사용자 수정은 등록 DTO가 아닌 비밀번호 없는 프로필 요청 계약을 문서화한다")
  void userProfileUpdateContract_isDocumented() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    tools.jackson.databind.JsonNode document =
        tools.jackson.databind.json.JsonMapper.builder().configureForJackson2().build().readTree(content);
    tools.jackson.databind.JsonNode request = document.path("paths")
        .path("/api/v1/users/me").path("put")
        .path("requestBody").path("content").path("application/json").path("schema");
    String schemaName = request.path("$ref").asString()
        .substring(request.path("$ref").asString().lastIndexOf('/') + 1);
    tools.jackson.databind.JsonNode schema = document.path("components").path("schemas").path(schemaName);
    java.util.List<String> required = schema.path("required").valueStream()
        .map(tools.jackson.databind.JsonNode::asString).toList();

    assertThat(required).contains("userNm");
    assertThat(schema.path("properties").has("userId")).isFalse();
    assertThat(schema.path("properties").has("pswd")).isFalse();
    assertThat(schema.path("properties").has("groupId")).isFalse();
    assertThat(schema.path("properties").has("ognzId")).isFalse();
    assertThat(schema.path("properties").has("pstinstCd")).isFalse();

    tools.jackson.databind.JsonNode adminRequest = document.path("paths")
        .path("/api/v1/admin/system/users/{userId}").path("put")
        .path("requestBody").path("content").path("application/json").path("schema");
    String adminSchemaName = adminRequest.path("$ref").asString()
        .substring(adminRequest.path("$ref").asString().lastIndexOf('/') + 1);
    tools.jackson.databind.JsonNode adminSchema =
        document.path("components").path("schemas").path(adminSchemaName);
    assertThat(adminSchema.path("properties").has("groupId")).isTrue();
    assertThat(adminSchema.path("properties").has("ognzId")).isTrue();
    assertThat(adminSchema.path("properties").has("pstinstCd")).isTrue();
  }



  @Test
  @DisplayName("자격증명·소유 증명 값은 OpenAPI path/query request-target에 존재하지 않는다")
  void credentialValues_areAbsentFromEveryRequestTarget() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    tools.jackson.databind.JsonNode document = objectMapper.readTree(content);

    CredentialRequestTargetScan scan = scanCredentialRequestTargets(document);

    assertThat(scan.operationCount())
        .as("빈 OpenAPI 문서라서 자격증명 검사가 공허하게 통과하면 안 된다")
        .isGreaterThan(100);
    assertThat(scan.queryParameterCount())
        .as("query parameter 모집단이 사라져 검사가 공허하게 통과하면 안 된다")
        .isGreaterThan(100);
    assertThat(scan.pathParameterCount())
        .as("path parameter 모집단이 사라져 검사가 공허하게 통과하면 안 된다")
        .isGreaterThan(100);
    assertThat(scan.violations())
        .as("request-target(path/query)은 브라우저·프록시·access log에 남으므로 자격증명을 둘 수 없다")
        .isEmpty();
  }

  @Test
  @DisplayName("만족도 공개 DTO와 삭제 계약에는 익명 비밀번호 증명 surface가 없다")
  void satisfactionPasswordProofSurface_isRetired() throws Exception {
    String content = mockMvc.perform(get("/v3/api-docs")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    tools.jackson.databind.JsonNode document = objectMapper.readTree(content);

    tools.jackson.databind.JsonNode schema =
        document.path("components").path("schemas").path("SatisfactionDto");
    tools.jackson.databind.JsonNode delete = document.path("paths")
        .path("/api/v1/boards/{bbsId}/posts/{pstSn}/satisfactions/{dgstfnSn}")
        .path("delete");

    assertThat(schema.isObject()).isTrue();
    assertThat(schema.path("properties").has("pswd")).isFalse();
    assertThat(delete.isObject()).isTrue();
    assertThat(delete.path("parameters").valueStream()
        .map(parameter -> resolveLocalReference(document, parameter))
        .filter(parameter -> "query".equals(parameter.path("in").asString()))
        .map(parameter -> parameter.path("name").asString())
        .toList()).isEmpty();
  }

  @Test
  @DisplayName("자격증명 request-target 게이트는 합성 pswd/token 위반을 red로 분류한다")
  void credentialRequestTargetGate_rejectsSyntheticViolations() throws Exception {
    tools.jackson.databind.JsonNode synthetic = objectMapper.readTree("""
        {
          "openapi": "3.0.1",
          "paths": {
            "/synthetic/{access_token}": {
              "parameters": [
                {"name": "access_token", "in": "path", "required": true}
              ],
              "get": {
                "parameters": [
                  {"name": "X-Auth-Token", "in": "header"}
                ]
              }
            },
            "/synthetic-delete": {
              "delete": {
                "parameters": [{"$ref": "#/components/parameters/PasswordProof"}],
                "requestBody": {
                  "content": {"application/json": {"schema": {"properties": {"password": {"type": "string"}}}}}
                }
              }
            }
          },
          "components": {
            "parameters": {
              "PasswordProof": {"$ref": "#/components/parameters/PasswordProofDefinition"},
              "PasswordProofDefinition": {"name": "pswd", "in": "query"}
            }
          }
        }
        """);

    CredentialRequestTargetScan scan = scanCredentialRequestTargets(synthetic);

    assertThat(scan.operationCount()).isEqualTo(2);
    assertThat(scan.requestTargetParameterCount()).isEqualTo(2);
    assertThat(scan.queryParameterCount()).isEqualTo(1);
    assertThat(scan.pathParameterCount()).isEqualTo(1);
    assertThat(scan.violations()).containsExactly(
        "DELETE /synthetic-delete query:pswd",
        "GET /synthetic/{access_token} path:access_token");
  }

  @Test
  @DisplayName("자격증명 request-target 게이트는 해석할 수 없는 parameter ref를 fail-closed 한다")
  void credentialRequestTargetGate_rejectsUnresolvedReferences() throws Exception {
    tools.jackson.databind.JsonNode synthetic = objectMapper.readTree("""
        {
          "openapi": "3.0.1",
          "paths": {
            "/synthetic": {
              "get": {
                "parameters": [{"$ref": "#/components/parameters/Missing"}]
              }
            }
          }
        }
        """);

    assertThatThrownBy(() -> scanCredentialRequestTargets(synthetic))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("OpenAPI parameter ref");
  }

  private static CredentialRequestTargetScan scanCredentialRequestTargets(
      tools.jackson.databind.JsonNode document) {
    java.util.List<String> violations = new java.util.ArrayList<>();
    int[] requestTargetCounts = new int[3];
    int operationCount = 0;
    java.util.Iterator<java.util.Map.Entry<String, tools.jackson.databind.JsonNode>> paths =
        document.path("paths").properties().iterator();
    while (paths.hasNext()) {
      java.util.Map.Entry<String, tools.jackson.databind.JsonNode> pathEntry = paths.next();
      String path = pathEntry.getKey();
      tools.jackson.databind.JsonNode pathItem = pathEntry.getValue();
      for (String method : HTTP_METHODS) {
        tools.jackson.databind.JsonNode operation = pathItem.path(method);
        if (!operation.isObject()) {
          continue;
        }
        operationCount++;
        collectCredentialParameters(
            document, path, method, pathItem.path("parameters"), violations, requestTargetCounts);
        collectCredentialParameters(
            document, path, method, operation.path("parameters"), violations, requestTargetCounts);
      }
    }
    violations.sort(String::compareTo);
    return new CredentialRequestTargetScan(
        operationCount,
        requestTargetCounts[0],
        requestTargetCounts[1],
        requestTargetCounts[2],
        java.util.List.copyOf(violations));
  }

  private static void collectCredentialParameters(
      tools.jackson.databind.JsonNode document,
      String path,
      String method,
      tools.jackson.databind.JsonNode parameters,
      java.util.List<String> violations,
      int[] requestTargetCounts) {
    if (!parameters.isArray()) {
      return;
    }
    for (tools.jackson.databind.JsonNode unresolved : parameters) {
      tools.jackson.databind.JsonNode parameter = resolveLocalReference(document, unresolved);
      String location = parameter.path("in").asString();
      String name = parameter.path("name").asString();
      if ("query".equals(location) || "path".equals(location)) {
        requestTargetCounts[0]++;
        requestTargetCounts["query".equals(location) ? 1 : 2]++;
      }
      if (("path".equals(location) || "query".equals(location))
          && CredentialRequestTargetPolicy.isForbiddenName(name)) {
        violations.add(method.toUpperCase(java.util.Locale.ROOT) + " " + path + " " + location + ":" + name);
      }
    }
  }

  private static tools.jackson.databind.JsonNode resolveLocalReference(
      tools.jackson.databind.JsonNode document,
      tools.jackson.databind.JsonNode candidate) {
    java.util.Set<String> visited = new java.util.HashSet<>();
    tools.jackson.databind.JsonNode resolved = candidate;
    while (resolved.has("$ref")) {
      String reference = resolved.path("$ref").asString();
      if (!reference.startsWith("#/") || !visited.add(reference)) {
        throw new IllegalArgumentException("OpenAPI parameter ref is external or cyclic: " + reference);
      }
      resolved = document.at(reference.substring(1));
      if (resolved.isMissingNode()) {
        throw new IllegalArgumentException("OpenAPI parameter ref cannot be resolved: " + reference);
      }
    }
    return resolved;
  }

  private record CredentialRequestTargetScan(
      int operationCount,
      int requestTargetParameterCount,
      int queryParameterCount,
      int pathParameterCount,
      java.util.List<String> violations) {
  }

  static boolean isNullableSchema(tools.jackson.databind.JsonNode schema) {
    if (schema.path("nullable").asBoolean(false)) {
      return true;
    }
    tools.jackson.databind.JsonNode type = schema.path("type");
    if (type.isArray()) {
      for (tools.jackson.databind.JsonNode candidate : type) {
        if ("null".equals(candidate.asString())) {
          return true;
        }
      }
    }
    return containsNullType(schema.path("anyOf")) || containsNullType(schema.path("oneOf"));
  }

  static void assertNullableProperties(
      tools.jackson.databind.JsonNode schema, String... propertyNames) {
    assertThat(schema.isMissingNode()).isFalse();
    tools.jackson.databind.JsonNode properties = schema.path("properties");
    for (String propertyName : propertyNames) {
      assertThat(isNullableSchema(properties.path(propertyName)))
          .as("%s.%s must accept explicit JSON null", schema.path("name").asString("schema"), propertyName)
          .isTrue();
    }
  }

  private static boolean containsNullType(tools.jackson.databind.JsonNode alternatives) {
    if (!alternatives.isArray()) {
      return false;
    }
    for (tools.jackson.databind.JsonNode alternative : alternatives) {
      if ("null".equals(alternative.path("type").asString())) {
        return true;
      }
    }
    return false;
  }

  /**
   * 커밋본과 <b>바이트 동일</b>한 형태로 정규화한다. [2026-08-03 신설]
   *
   * <p>[왜 필요한가 — 잠복 파손] Wave 2 가 {@code api-docs.json} 을 pretty 로 바꿨다(1줄 282KB →
   * 25,616줄). 라인 단위 diff 가 가능해져 동시 개발 시 머지 충돌이 줄어드는 정당한 개선이다.
   * 그런데 <b>재생성 경로는 그대로 minify 였다</b> — 이 메서드가 없으면 CI 의
   * {@code ./gradlew build -Dopenapi.export.path=api-docs.json}(ci.yml:155)가 minify 로 덮어쓰고,
   * 곧바로 뒤따르는 {@code git diff --exit-code api-docs.json}(ci.yml:183, api-docs-gate)이
   * <b>내용이 의미상 동일해도 항상 non-empty</b> 가 되어 게이트가 <b>영구 red</b> 가 된다.
   * 로컬에서는 이 경로를 돌 일이 드물어 드러나지 않고, CI 가 복구되는 시점에 즉시 터진다.
   *
   * <p>[왜 Jackson 기본 pretty 가 아닌가] 포맷터가 둘이면 둘 다 맞아야 한다.
   * 저장소의 다른 정규화 지점은 {@code frontend/package.json} 의 {@code format:api-docs}
   * ({@code JSON.stringify(d, null, 2) + '\n'}) 이므로, 여기서도 <b>그 출력과 정확히 일치</b>하도록
   * 구분자·들여쓰기를 맞춘다. Jackson 기본값은 {@code "key" : value}(콜론 앞 공백)이고 배열을
   * 한 줄에 붙이므로 그대로 쓰면 두 포맷터가 매 재생성마다 서로를 덮어쓴다.
   *
   * <p>키 정렬은 하지 않는다 — springdoc 의 산출 순서를 바꾸면 {@code generated-api.d.ts} 의
   * 선언 순서까지 흔들려 계약 게이트 3종이 동시에 재생성을 요구한다. 순서 안정성은 별건이다.
   */
  private static String normalizeForCommit(String rawJson) throws Exception {
    tools.jackson.databind.ObjectMapper mapper = tools.jackson.databind.json.JsonMapper.builder().configureForJackson2().build();
    Object tree = mapper.readValue(rawJson, Object.class);

    tools.jackson.core.util.DefaultIndenter indenter =
        new tools.jackson.core.util.DefaultIndenter("  ", "\n");
    // JSON.stringify 는 `"key": value` 이고 빈 컨테이너가 `[]`·`{}` 다. Jackson 기본은 콜론 **앞**에도 공백을
    //   넣고 빈 컨테이너 안에 공백을 둔다(`[ ]`). 한 글자만 어긋나도 재생성본과 커밋본이 매번 달라져
    //   api-docs 게이트가 영구 red 가 된다. Jackson 2 에서는 빈 컨테이너를 서브클래스로 고쳤지만(_nesting 까지
    //   되돌려야 했다), Jackson 3 는 빈 컨테이너 구분자를 Separators 로 받는다(ADR-0024 2단계).
    tools.jackson.core.util.DefaultPrettyPrinter printer =
        new tools.jackson.core.util.DefaultPrettyPrinter(tools.jackson.core.util.Separators.createDefaultInstance()
                .withObjectNameValueSpacing(tools.jackson.core.util.Separators.Spacing.AFTER)
                .withArrayEmptySeparator("")
                .withObjectEmptySeparator(""))
            .withObjectIndenter(indenter)
            .withArrayIndenter(indenter);

    return mapper.writer().with(printer).writeValueAsString(tree) + "\n";
  }
}
