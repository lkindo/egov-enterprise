package nuri.foundation.domain.mypage;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("IndvdlPge 엔티티 테스트")
class IndvdlPgeTest {

    @Test
    @DisplayName("IndvdlPge 생성 및 갱신 테스트")
    void testIndvdlPgeUpdate() {
        // Given
        IndvdlPge pge = IndvdlPge.builder()
                .cntntsId("CNTNTS_001")
                .cntntsNm("테스트 콘텐츠")
                .cntntsUseAt("Y")
                .cntntsLinkUrl("/test/url")
                .cntntsDc("설명")
                .build();

        // When
        pge.update("수정된 명칭", "N", "/new/url", "새 설명");

        // Then
        assertEquals("수정된 명칭", pge.getCntntsNm());
        assertEquals("N", pge.getCntntsUseAt());
        assertEquals("/new/url", pge.getCntntsLinkUrl());
        assertEquals("새 설명", pge.getCntntsDc());
    }
}
