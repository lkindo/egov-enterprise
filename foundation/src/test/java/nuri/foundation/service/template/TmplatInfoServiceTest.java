package nuri.foundation.service.template;

import nuri.foundation.domain.template.TmplatInfo;
import nuri.foundation.domain.template.TmplatInfoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("템플릿 정보 서비스 테스트")
class TmplatInfoServiceTest {

    @Mock
    private TmplatInfoRepository tmplatInfoRepository;

    @InjectMocks
    private TmplatInfoService tmplatInfoService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("템플릿 목록 조회")
    void selectTmplatInfoList() {
        // given
        when(tmplatInfoRepository.findAll()).thenReturn(Collections.emptyList());

        // when
        List<TmplatInfo> result = tmplatInfoService.selectTmplatInfoList();

        // then
        assertThat(result).isEmpty();
        verify(tmplatInfoRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("템플릿 상세 조회")
    void selectTmplatInfoDetail() {
        // given
        TmplatInfo tmplat = TmplatInfo.builder().tmplatId("TMPLT_001").build();
        when(tmplatInfoRepository.findById("TMPLT_001")).thenReturn(Optional.of(tmplat));

        // when
        TmplatInfo result = tmplatInfoService.selectTmplatInfoDetail("TMPLT_001");

        // then
        assertThat(result).isNotNull();
        assertThat(result.getTmplatId()).isEqualTo("TMPLT_001");
    }

    @Test
    @DisplayName("템플릿 등록")
    void insertTmplatInfo() {
        // given
        TmplatInfo tmplat = TmplatInfo.builder().tmplatNm("New Template").build();

        // when
        tmplatInfoService.insertTmplatInfo(tmplat);

        // then
        verify(tmplatInfoRepository, times(1)).save(tmplat);
    }
    @Test
    @DisplayName("템플릿 타입별 목록 조회")
    void selectTmplatInfoListByType() {
        // given
        when(tmplatInfoRepository.findByTmplatSeCode("TYPE01")).thenReturn(Collections.emptyList());

        // when
        List<TmplatInfo> result = tmplatInfoService.selectTmplatInfoListByType("TYPE01");

        // then
        assertThat(result).isEmpty();
        verify(tmplatInfoRepository, times(1)).findByTmplatSeCode("TYPE01");
    }

    @Test
    @DisplayName("템플릿 상세 조회 실패 - 존재하지 않음")
    void selectTmplatInfoDetailFail() {
        // given
        when(tmplatInfoRepository.findById("NOT_FOUND")).thenReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> tmplatInfoService.selectTmplatInfoDetail("NOT_FOUND"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("템플릿 삭제")
    void deleteTmplatInfo() {
        // when
        tmplatInfoService.deleteTmplatInfo("TMPLT_001");

        // then
        verify(tmplatInfoRepository, times(1)).deleteById("TMPLT_001");
    }
}
