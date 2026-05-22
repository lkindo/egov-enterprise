package nuri.business.domain.board;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Template 엔티티 단위 테스트")
class TemplateTest {

    @Test
    @DisplayName("Template 빌더 및 기본값 테스트")
    void builderTest() {
        Template template = Template.builder()
                .tmpltId("TMP_01")
                .tmpltNm("Default Template")
                .tmpltPath("/path/to/template")
                .tmpltSeCd("SE01")
                .build();

        assertThat(template.getTmpltId()).isEqualTo("TMP_01");
        assertThat(template.getTmpltNm()).isEqualTo("Default Template");
        assertThat(template.getTmpltPath()).isEqualTo("/path/to/template");
        assertThat(template.getTmpltSeCd()).isEqualTo("SE01");
        assertThat(template.getUseYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("Template 수정 비즈니스 로직 테스트")
    void updateTest() {
        Template template = Template.builder()
                .tmpltNm("Old Name")
                .tmpltPath("Old Path")
                .useYn("Y")
                .tmpltSeCd("OLD")
                .build();

        template.update("New Name", "New Path", "N", "NEW");

        assertThat(template.getTmpltNm()).isEqualTo("New Name");
        assertThat(template.getTmpltPath()).isEqualTo("New Path");
        assertThat(template.getUseYn()).isEqualTo("N");
        assertThat(template.getTmpltSeCd()).isEqualTo("NEW");
    }

    @Test
    @DisplayName("Template 레거시 별칭(Aliases) Getter/Setter 테스트")
    void legacyAliasesAndSettersTest() {
        Template template = Template.builder().build();

        // Setter aliases 호출
        template.setTmplatId("TMP_LGC");
        template.setTmplatNm("Legacy Name");
        template.setTmplatCours("/legacy/path");
        template.setTmplatSeCode("LGC_SE");

        // Getter aliases 및 매핑 검증
        assertThat(template.getTmplatId()).isEqualTo("TMP_LGC");
        assertThat(template.getTmpltId()).isEqualTo("TMP_LGC");

        assertThat(template.getTmplatNm()).isEqualTo("Legacy Name");
        assertThat(template.getTmpltNm()).isEqualTo("Legacy Name");

        assertThat(template.getTmplatCours()).isEqualTo("/legacy/path");
        assertThat(template.getTmpltPath()).isEqualTo("/legacy/path");

        assertThat(template.getTmplatSeCode()).isEqualTo("LGC_SE");
        assertThat(template.getTmpltSeCd()).isEqualTo("LGC_SE");
    }

    @Test
    @DisplayName("Template 커스텀 빌더 확장 메서드 검증")
    void customBuilderTest() {
        Template template = Template.builder()
                .tmplatId("TMP_BUILD")
                .tmplatNm("Build Template")
                .tmplatCours("/build/path")
                .tmplatSeCode("BUILD_SE")
                .build();

        assertThat(template.getTmpltId()).isEqualTo("TMP_BUILD");
        assertThat(template.getTmpltNm()).isEqualTo("Build Template");
        assertThat(template.getTmpltPath()).isEqualTo("/build/path");
        assertThat(template.getTmpltSeCd()).isEqualTo("BUILD_SE");
    }
}
