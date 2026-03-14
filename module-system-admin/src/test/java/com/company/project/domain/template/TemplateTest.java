package com.company.project.domain.template;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Template 엔티티 테스트")
class TemplateTest {

    @Test
    @DisplayName("Template 엔티티 빌더 및 초기화 테스트")
    void builderTest() {
        Template template = Template.builder()
                .tmplatId("TMP_001")
                .tmplatNm("Main Template")
                .tmplatCours("/templates/main")
                .tmplatSeCode("T01")
                .useAt("Y")
                .createdBy("admin")
                .build();

        assertThat(template.getTmplatId()).isEqualTo("TMP_001");
        assertThat(template.getTmplatNm()).isEqualTo("Main Template");
        assertThat(template.getTmplatCours()).isEqualTo("/templates/main");
        assertThat(template.getUseAt()).isEqualTo("Y");
    }

    @Test
    @DisplayName("Template 엔티티 수정 테스트")
    void updateTest() {
        Template template = Template.builder()
                .tmplatId("TMP_001")
                .tmplatNm("Old Template")
                .build();

        template.update("New Template", "/new/path", "T02", "N");

        assertThat(template.getTmplatNm()).isEqualTo("New Template");
        assertThat(template.getTmplatCours()).isEqualTo("/new/path");
        assertThat(template.getTmplatSeCode()).isEqualTo("T02");
        assertThat(template.getUseAt()).isEqualTo("N");
    }
}
