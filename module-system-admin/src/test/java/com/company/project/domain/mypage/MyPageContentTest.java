package com.company.project.domain.mypage;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("MyPageContent 엔티티 테스트")
class MyPageContentTest {

    @Test
    @DisplayName("MyPageContent 빌더 및 초기화 테스트")
    void builderTest() {
        MyPageContent content = MyPageContent.builder()
                .cntntsId("CONT_001")
                .cntntsNm("Weather Widget")
                .cntntsLinkUrl("/widgets/weather")
                .cntntsDc("Shows current weather")
                .cntntsUseAt("Y")
                .frstRegisterId("admin")
                .build();

        assertThat(content.getCntntsId()).isEqualTo("CONT_001");
        assertThat(content.getCntntsNm()).isEqualTo("Weather Widget");
        assertThat(content.getFrstRegisterId()).isEqualTo("admin");
        assertThat(content.getFrstRegisterPnttm()).isNotNull();
    }

    @Test
    @DisplayName("MyPageContent 수정 테스트")
    void updateTest() {
        MyPageContent content = MyPageContent.builder()
                .cntntsId("CONT_001")
                .cntntsNm("Old Widget")
                .build();

        content.update("New Widget", "/new/url", "New Dc", "N", "user01");

        assertThat(content.getCntntsNm()).isEqualTo("New Widget");
        assertThat(content.getCntntsLinkUrl()).isEqualTo("/new/url");
        assertThat(content.getLastUpdusrId()).isEqualTo("user01");
        assertThat(content.getLastUpdusrPnttm()).isNotNull();
    }
}
