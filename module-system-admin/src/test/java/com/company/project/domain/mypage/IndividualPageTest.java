package com.company.project.domain.mypage;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("IndividualPage 엔티티 테스트")
class IndividualPageTest {

    @Test
    @DisplayName("IndividualPage 빌더 및 초기화 테스트")
    void builderTest() {
        IndividualPage page = IndividualPage.builder()
                .pageId("PAGE_001")
                .pageNm("My Custom Page")
                .pageDc("Personal Dashboard")
                .userId("user01")
                .frstRegisterId("admin")
                .build();

        assertThat(page.getPageId()).isEqualTo("PAGE_001");
        assertThat(page.getPageNm()).isEqualTo("My Custom Page");
        assertThat(page.getUserId()).isEqualTo("user01");
        assertThat(page.getFrstRegisterId()).isEqualTo("admin");
    }

    @Test
    @DisplayName("IndividualPage 수정 테스트")
    void updateTest() {
        IndividualPage page = IndividualPage.builder()
                .pageId("PAGE_001")
                .pageNm("Old Page")
                .build();

        page.update("New Page", "New Description", "user02");

        assertThat(page.getPageNm()).isEqualTo("New Page");
        assertThat(page.getPageDc()).isEqualTo("New Description");
        assertThat(page.getLastUpdusrId()).isEqualTo("user02");
    }
}
