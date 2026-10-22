package nuri.business.service.cms;

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
            tests.add(DynamicTest.dynamicTest(name, () -> {
                Map<String, Object> document = asMap(fixture.get("document"));
                if (fixture.get("valid").booleanValue()) {
                    CmsDocumentValidator.Normalized result = validator.normalize(document);
                    JsonNode expected = fixture.get("normalized");
                    if (expected != null) {
                        assertThat(MAPPER.readTree(result.json())).isEqualTo(expected);
                    }
                    // 정규화는 멱등이다 — 저장본을 다시 검증해도 같은 문서다(게시 직전 재검증의 전제).
                    assertThat(validator.normalizeJson(result.json()).document()).isEqualTo(result.document());
                } else {
                    assertThatThrownBy(() -> validator.normalize(document))
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
        CmsDocumentValidator.Normalized result = validator.normalize(asMap(fixture.get("document")));
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
        assertThatThrownBy(() -> validator.normalize(document))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("1MiB");
    }

    @Test
    void rejectsMissingDocument() {
        assertThatThrownBy(() -> validator.normalize(null)).isInstanceOf(BusinessException.class);
    }
}
