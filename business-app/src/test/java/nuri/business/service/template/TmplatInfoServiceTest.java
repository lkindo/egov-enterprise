package nuri.business.service.template;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.template.Template;
import nuri.business.domain.template.TemplateRepository;
import nuri.business.service.template.dto.TemplateDto;
import nuri.business.service.template.dto.TemplateMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.Spy;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@DisplayName("템플릿 정보 서비스 테스트")
class TmplatInfoServiceTest {

    @Mock
    private TemplateRepository templateRepository;

    // 실제 MapStruct 매퍼 구현체를 주입해 기존 매핑 검증 의미를 보존한다.
    @Spy
    private TemplateMapper templateMapper = Mappers.getMapper(TemplateMapper.class);

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
        when(templateRepository.findAll()).thenReturn(Collections.emptyList());

        // when
        List<TemplateDto> result = tmplatInfoService.selectTmplatInfoList();

        // then
        assertThat(result).isEmpty();
        verify(templateRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("템플릿 상세 조회")
    void selectTmplatInfoDetail() {
        // given
        Template tmplat = Template.builder().tmpltId("TMPLT_001").build();
        when(templateRepository.findById("TMPLT_001")).thenReturn(Optional.of(tmplat));

        // when
        TemplateDto result = tmplatInfoService.selectTmplatInfoDetail("TMPLT_001");

        // then
        assertThat(result).isNotNull();
        assertThat(result.getTmpltId()).isEqualTo("TMPLT_001");
    }

    @Test
    @DisplayName("템플릿 등록")
    void insertTmplatInfo() {
        // given
        TemplateDto tmplatDto = TemplateDto.builder().tmpltNm("New Template").build();

        // when
        tmplatInfoService.insertTmplatInfo(tmplatDto);

        // then
        verify(templateRepository, times(1)).save(any(Template.class));
    }

    @Test
    @DisplayName("템플릿 타입별 목록 조회")
    void selectTmplatInfoListByType() {
        // given
        when(templateRepository.findByTmpltSeCd("TYPE01")).thenReturn(Collections.emptyList());

        // when
        List<TemplateDto> result = tmplatInfoService.selectTmplatInfoListByType("TYPE01");

        // then
        assertThat(result).isEmpty();
        verify(templateRepository, times(1)).findByTmpltSeCd("TYPE01");
    }

    @Test
    @DisplayName("템플릿 상세 조회 실패 - 존재하지 않음")
    void selectTmplatInfoDetailFail() {
        // given
        when(templateRepository.findById("NOT_FOUND")).thenReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> tmplatInfoService.selectTmplatInfoDetail("NOT_FOUND"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("템플릿 삭제")
    void deleteTmplatInfo() {
        // when
        tmplatInfoService.deleteTmplatInfo("TMPLT_001");

        // then
        verify(templateRepository, times(1)).deleteById("TMPLT_001");
    }
}
