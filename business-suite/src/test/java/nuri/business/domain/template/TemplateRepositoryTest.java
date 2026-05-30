package nuri.business.domain.template;

import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("템플릿 정보 리포지토리 테스트")
class TemplateRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private TemplateRepository templateRepository;

    @Test
    @DisplayName("템플릿 저장 및 조회")
    void saveAndFind() {
        // given
        Template template = Template.builder()
                .tmplatId("TMPLT_001")
                .tmplatNm("테스트 템플릿")
                .tmplatSeCode("TMS001")
                .tmplatCours("/test/path")
                .useYn("Y")
                .build();

        // when
        templateRepository.save(template);
        Optional<Template> result = templateRepository.findById("TMPLT_001");

        // then
        assertThat(result).isPresent();
        assertThat(result.get().getTmplatNm()).isEqualTo("테스트 템플릿");
    }

    @Test
    @DisplayName("템플릿 수정")
    void update() {
        // given
        Template template = Template.builder()
                .tmplatId("TMPLT_002")
                .tmplatNm("구 템플릿")
                .tmplatSeCode("TMS001")
                .tmplatCours("/test/path")
                .useYn("Y")
                .build();
        templateRepository.save(template);

        // when
        Template saved = templateRepository.findById("TMPLT_002").orElseThrow();
        saved.update("신 템플릿", "TMS002", "/new/path", "N");
        templateRepository.saveAndFlush(saved);

        // then
        Template result = templateRepository.findById("TMPLT_002").orElseThrow();
        assertThat(result.getTmplatNm()).isEqualTo("신 템플릿");
        assertThat(result.getTmplatSeCode()).isEqualTo("TMS002");
        assertThat(result.getUseYn()).isEqualTo("N");
    }
}
