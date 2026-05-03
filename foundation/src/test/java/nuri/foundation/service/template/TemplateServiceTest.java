package nuri.foundation.service.template;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.template.Template;
import nuri.foundation.domain.template.TemplateRepository;
import nuri.foundation.service.template.dto.TemplateDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TemplateService 단위 테스트")
class TemplateServiceTest {

    @InjectMocks
    private TemplateService templateService;

    @Mock
    private TemplateRepository templateRepository;

    @Test
    @DisplayName("템플릿 목록 조회 - 키워드 없음")
    void getTemplateList_NoKeyword() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        Template template = Template.builder().tmplatId("TMPL_1").tmplatNm("Test").build();
        given(templateRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(template)));

        // when
        Page<TemplateDto> result = templateService.getTemplateList(null, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getTmplatNm()).isEqualTo("Test");
    }

    @Test
    @DisplayName("템플릿 목록 조회 - 키워드 검색")
    void getTemplateList_WithKeyword() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        Template template = Template.builder().tmplatId("TMPL_1").tmplatNm("KeywordTest").build();
        given(templateRepository.findByTmplatNmContaining("Keyword", pageable)).willReturn(new PageImpl<>(List.of(template)));

        // when
        Page<TemplateDto> result = templateService.getTemplateList("Keyword", pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getTmplatNm()).isEqualTo("KeywordTest");
    }

    @Test
    @DisplayName("유형별 템플릿 조회")
    void getTemplatesByType() {
        Pageable pageable = PageRequest.of(0, 10);
        given(templateRepository.findByTmplatSeCode("TYPE1", pageable)).willReturn(new PageImpl<>(List.of()));

        templateService.getTemplatesByType("TYPE1", pageable);

        verify(templateRepository).findByTmplatSeCode("TYPE1", pageable);
    }

    @Test
    @DisplayName("템플릿 단건 조회 - 성공")
    void getTemplate_Success() {
        Template template = Template.builder().tmplatId("T1").build();
        given(templateRepository.findById("T1")).willReturn(Optional.of(template));

        TemplateDto dto = templateService.getTemplate("T1");

        assertThat(dto.getTmplatId()).isEqualTo("T1");
    }

    @Test
    @DisplayName("템플릿 단건 조회 - 실패")
    void getTemplate_Fail() {
        given(templateRepository.findById("UNKNOWN")).willReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> templateService.getTemplate("UNKNOWN"));
    }

    @Test
    @DisplayName("템플릿 생성")
    void createTemplate() {
        TemplateDto dto = TemplateDto.builder().tmplatNm("New").tmplatCours("/path").tmplatSeCode("C1").useAt("Y").build();

        String id = templateService.createTemplate("user1", dto);

        assertThat(id).startsWith("TMPL_");
        verify(templateRepository).save(any(Template.class));
    }

    @Test
    @DisplayName("템플릿 수정 - 성공")
    void updateTemplate_Success() {
        Template template = mock(Template.class);
        given(templateRepository.findById("T1")).willReturn(Optional.of(template));

        TemplateDto dto = TemplateDto.builder().tmplatNm("New").tmplatCours("/n").tmplatSeCode("S").useAt("N").build();
        templateService.updateTemplate("T1", "user1", dto);

        verify(template).update("New", "/n", "S", "N");
    }

    @Test
    @DisplayName("템플릿 삭제")
    void deleteTemplate() {
        Template template = Template.builder().tmplatId("T1").build();
        given(templateRepository.findById("T1")).willReturn(Optional.of(template));

        templateService.deleteTemplate("T1");

        verify(templateRepository).delete(template);
    }

    @Test
    @DisplayName("사용 중인 템플릿 목록 조회")
    void getActiveTemplates() {
        given(templateRepository.findByUseAt("Y")).willReturn(List.of());

        templateService.getActiveTemplates();

        verify(templateRepository).findByUseAt("Y");
    }

    @Test
    @DisplayName("유형별 사용 중인 템플릿 목록 조회")
    void getActiveTemplatesByType() {
        given(templateRepository.findByTmplatSeCodeAndUseAt("T1", "Y")).willReturn(List.of());

        templateService.getActiveTemplatesByType("T1");

        verify(templateRepository).findByTmplatSeCodeAndUseAt("T1", "Y");
    }
}
