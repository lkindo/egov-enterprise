package nuri.foundation.domain.mypage;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("IndividualPage 엔티티 테스트")
class IndividualPageTest {

    @Test
    @DisplayName("IndividualPage 생성 및 갱신 테스트")
    void testIndividualPageUpdate() {
        // Given
        IndividualPage pge = IndividualPage.builder()
                .pageId("PGE_001")
                .pageNm("테스트 페이지")
                .pageDc("설명")
                .userId("user1")
                .build();

        // When
        pge.update("수정된 명칭", "새 설명");

        // Then
        assertEquals("수정된 명칭", pge.getPageNm());
        assertEquals("새 설명", pge.getPageDc());
    }
}
