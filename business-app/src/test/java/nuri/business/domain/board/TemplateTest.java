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
}
