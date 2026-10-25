package nuri.business.service.cms;

import nuri.business.service.cms.CmsDocumentValidator.Mode;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static java.nio.charset.StandardCharsets.UTF_8;

/**
 * 콘텐츠 문서 판정(ADR-0039 결정 5). 공용 fixture 는 화면 정규화 시험도 읽는다 — 두 구현이 같은 문서를 같은 결과로 판정해야 한다.
 */
class CmsDocumentValidatorTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private final CmsDocumentValidator validator = new CmsDocumentValidator();

    private static JsonNode fixtures() {
        try (InputStream input = CmsDocumentValidatorTest.class
                .getResourceAsStream("/nuri/business/service/cms/cms-document-fixtures.json")) {
            return MAPPER.readTree(input);
        } catch (java.io.IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(JsonNode node) {
        return MAPPER.convertValue(node, Map.class);
    }

    @TestFactory
    Stream<DynamicTest> fixtureCases() {
        List<DynamicTest> tests = new ArrayList<>();
        for (JsonNode fixture : fixtures().get("cases")) {
            String name = fixture.get("name").stringValue();
            // mode 가 없는 사례는 게시 판정이다(ADR-0039 의 원래 규칙). 초안 판정은 ADR-0042 가 넓힌 수준이다.
            Mode mode = fixture.has("mode") ? Mode.valueOf(fixture.get("mode").stringValue().toUpperCase(java.util.Locale.ROOT))
                    : Mode.PUBLISH;
            tests.add(DynamicTest.dynamicTest(name, () -> {
                Map<String, Object> document = asMap(fixture.get("document"));
                if (fixture.get("valid").booleanValue()) {
                    CmsDocumentValidator.Normalized result = validator.normalize(document, mode);
                    JsonNode expected = fixture.get("normalized");
                    if (expected != null) {
                        assertThat(MAPPER.readTree(result.json())).isEqualTo(expected);
                    }
                    // 정규화는 멱등이다 — 저장본을 다시 검증해도 같은 문서다(게시 직전 재검증의 전제).
                    assertThat(validator.normalizeJson(result.json(), mode).document()).isEqualTo(result.document());
                    if (mode == Mode.PUBLISH) {
                        // 초안 판정은 게시 판정을 넓힐 뿐이다 — 게시할 수 있는 문서는 초안으로도 같은 모양으로 저장된다.
                        assertThat(validator.normalize(document, Mode.DRAFT).json()).isEqualTo(result.json());
                    }
                } else {
                    assertThatThrownBy(() -> validator.normalize(document, mode))
                            .isInstanceOf(BusinessException.class)
                            .satisfies(error -> assertThat(((BusinessException) error).getErrorCode())
                                    .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE))
                            .hasMessageContaining(fixture.get("error").stringValue());
                }
            }));
        }
        return tests.stream();
    }

    @Test
    void linkAddressesFollowTheSharedFixture() {
        JsonNode hrefs = fixtures().get("hrefs");
        for (JsonNode href : hrefs.get("valid")) {
            assertThat(CmsDocumentValidator.safeHref(href.stringValue())).as(href.stringValue()).isNotNull();
        }
        for (JsonNode href : hrefs.get("invalid")) {
            assertThat(CmsDocumentValidator.safeHref(href.stringValue())).as(href.stringValue()).isNull();
        }
    }

    @Test
    void imageCellsAreCollectedForOwnershipChecks() {
        JsonNode fixture = fixtures().get("cases").get(2);
        CmsDocumentValidator.Normalized result = validator.normalize(asMap(fixture.get("document")), Mode.PUBLISH);
        assertThat(result.images()).containsExactly(7L);
    }

    @Test
    void sameDocumentIgnoresKeyOrderAndWhitespace() {
        String left = "{\"schemaVersion\":1,\"sections\":[]}";
        String right = "{ \"sections\" : [ ], \"schemaVersion\" : 1 }";
        assertThat(validator.sameDocument(left, right)).isTrue();
        assertThat(validator.sameDocument(left, "{\"schemaVersion\":1,\"sections\":[1]}")).isFalse();
    }

    @Test
    void rejectsDocumentsOverTheSizeLimit() {
        String longText = "가".repeat(400_000);
        Map<String, Object> document = Map.of("schemaVersion", 1, "sections", List.of(Map.of(
                "id", "a", "label", "", "layout", "one", "tone", "default", "spacing", "normal",
                "cells", List.of(Map.of("kind", "rich", "doc", Map.of("type", "doc", "content", List.of(
                        Map.of("type", "paragraph", "content", List.of(Map.of("type", "text", "text", longText))))))))));
        assertThatThrownBy(() -> validator.normalize(document, Mode.PUBLISH))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("1MiB");
    }

    @Test
    void rejectsMissingDocument() {
        assertThatThrownBy(() -> validator.normalize(null, Mode.DRAFT)).isInstanceOf(BusinessException.class);
    }

    @Test
    void acceptsADocumentWhoseNormalizedJsonIsExactlyTheLimitAndRejectsOneByteMore() {
        // 정밀한 크기 상한은 검증기가 저장할 압축 JSON 의 바이트 수다. DB 상한(jsonb::text 2 MiB)은 그 위의 안전망이다.
        int room = CmsDocumentValidator.MAX_BYTES - validator.normalize(sizedDocument(0), Mode.PUBLISH).json().getBytes(UTF_8).length;
        CmsDocumentValidator.Normalized atLimit = validator.normalize(sizedDocument(room), Mode.PUBLISH);
        assertThat(atLimit.json().getBytes(UTF_8).length).isEqualTo(CmsDocumentValidator.MAX_BYTES);
        assertThatThrownBy(() -> validator.normalize(sizedDocument(room + 1), Mode.PUBLISH)).isInstanceOf(BusinessException.class);
    }

    /** 문단 1,990개(한글 100자씩)에 마지막 문단만 영문자 extra 개를 더한 문서. */
    private static Map<String, Object> sizedDocument(int extra) {
        List<Object> content = new ArrayList<>();
        for (int index = 0; index < 1_990; index++) {
            content.add(Map.of("type", "paragraph", "content", List.of(Map.of("type", "text", "text", "가".repeat(100)))));
        }
        content.add(Map.of("type", "paragraph", "content", List.of(Map.of("type", "text", "text", "a" + "a".repeat(extra)))));
        Map<String, Object> section = Map.of("id", "a", "label", "", "layout", "one", "tone", "default", "spacing", "normal",
                "cells", List.of(Map.of("kind", "rich", "doc", Map.of("type", "doc", "content", content))));
        return Map.of("schemaVersion", 1, "sections", List.of(section));
    }
}
