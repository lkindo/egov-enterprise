package nuri.openapi;

import nuri.business.support.IntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

/**
 * OpenAPI 문서화 테스트
 * API 문서화 생성 및 검증
 */
@IntegrationTest
@AutoConfigureMockMvc
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

  @Autowired
  private MockMvc mockMvc;

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
    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
    Object tree = mapper.readValue(rawJson, Object.class);

    com.fasterxml.jackson.core.util.DefaultIndenter indenter =
        new com.fasterxml.jackson.core.util.DefaultIndenter("  ", "\n");
    // ⚠ 순서 주의: `withArrayIndenter`/`withSeparators` 는 내부에서 `new DefaultPrettyPrinter(this)` 를
    //   반환하므로 **서브클래스가 유실된다**. 그래서 설정을 먼저 얹은 뒤 마지막에 감싼다.
    //   (반대로 하면 빈 배열이 다시 `[ ]` 가 되고 재생성본이 커밋본과 어긋난다 — 실측으로 확인했다.)
    com.fasterxml.jackson.core.util.DefaultPrettyPrinter configured =
        new com.fasterxml.jackson.core.util.DefaultPrettyPrinter()
            .withObjectIndenter(indenter)
            .withArrayIndenter(indenter)
            // JSON.stringify 는 `"key": value` 다. Jackson 기본은 콜론 **앞**에도 공백을 넣는다.
            .withSeparators(com.fasterxml.jackson.core.util.Separators.createDefaultInstance()
                .withObjectFieldValueSpacing(com.fasterxml.jackson.core.util.Separators.Spacing.AFTER));

    return mapper.writer(new JsonStringifyPrinter(configured)).writeValueAsString(tree) + "\n";
  }

  /**
   * 빈 컨테이너를 {@code []} / <code>{}</code> 로 쓴다.
   *
   * <p>Jackson 의 {@code DefaultPrettyPrinter} 는 값이 0개여도 구분 공백을 넣어 {@code [ ]} 를 만든다.
   * {@code JSON.stringify} 는 {@code []} 다. 이 한 글자가 어긋나면 재생성본과 커밋본이 매번 달라져
   * {@code api-docs-gate}(ci.yml:183)가 영구 red 가 된다 — 실측으로 이 차이 하나만 남았었다.
   */
  private static final class JsonStringifyPrinter extends com.fasterxml.jackson.core.util.DefaultPrettyPrinter {
    private static final long serialVersionUID = 1L;

    JsonStringifyPrinter() {
      super();
    }

    JsonStringifyPrinter(com.fasterxml.jackson.core.util.DefaultPrettyPrinter base) {
      super(base);
    }

    @Override
    public com.fasterxml.jackson.core.util.DefaultPrettyPrinter createInstance() {
      return new JsonStringifyPrinter(this);
    }

    // ⚠ 들여쓰기 상태(_nesting)는 반드시 함께 되돌린다. 이걸 빠뜨리면 빈 컨테이너 **이후의 모든 줄**이
    //   한 단계씩 밀려 파일 전체가 어긋난다(실측으로 한 번 겪었다). 상위 구현이 하는 일을 그대로 하되
    //   값이 0개일 때 공백만 쓰지 않는다.
    @Override
    public void writeEndArray(com.fasterxml.jackson.core.JsonGenerator g, int nrOfValues)
        throws java.io.IOException {
      if (nrOfValues == 0) {
        if (!_arrayIndenter.isInline()) {
          --_nesting;
        }
        g.writeRaw(']');
        return;
      }
      super.writeEndArray(g, nrOfValues);
    }

    @Override
    public void writeEndObject(com.fasterxml.jackson.core.JsonGenerator g, int nrOfEntries)
        throws java.io.IOException {
      if (nrOfEntries == 0) {
        if (!_objectIndenter.isInline()) {
          --_nesting;
        }
        g.writeRaw('}');
        return;
      }
      super.writeEndObject(g, nrOfEntries);
    }
  }
}
