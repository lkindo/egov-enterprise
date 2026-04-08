package nuri.foundation.domain.template;

import nuri.foundation.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("템플릿 정보 리포지토리 테스트")
class TmplatInfoRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private TmplatInfoRepository tmplatInfoRepository;

    @Test
    @DisplayName("템플릿 저장 및 조회")
    void saveAndFind() {
        // given
        TmplatInfo tmplatInfo = TmplatInfo.builder()
                .tmplatId("TMPLT_001")
                .tmplatNm("테스트 템플릿")
                .tmplatSeCode("TMS001")
                .tmplatCours("/test/path")
                .useAt("Y")
                .build();

        // when
        tmplatInfoRepository.save(tmplatInfo);
        Optional<TmplatInfo> result = tmplatInfoRepository.findById("TMPLT_001");

        // then
        assertThat(result).isPresent();
        assertThat(result.get().getTmplatNm()).isEqualTo("테스트 템플릿");
    }

    @Test
    @DisplayName("템플릿 수정")
    void update() {
        // given
        TmplatInfo tmplatInfo = TmplatInfo.builder()
                .tmplatId("TMPLT_002")
                .tmplatNm("구 템플릿")
                .tmplatSeCode("TMS001")
                .useAt("Y")
                .build();
        tmplatInfoRepository.save(tmplatInfo);

        // when
        TmplatInfo saved = tmplatInfoRepository.findById("TMPLT_002").orElseThrow();
        saved.update("신 템플릿", "TMS002", "/new/path", "N");
        tmplatInfoRepository.saveAndFlush(saved);

        // then
        TmplatInfo result = tmplatInfoRepository.findById("TMPLT_002").orElseThrow();
        assertThat(result.getTmplatNm()).isEqualTo("신 템플릿");
        assertThat(result.getTmplatSeCode()).isEqualTo("TMS002");
        assertThat(result.getUseAt()).isEqualTo("N");
    }
}
