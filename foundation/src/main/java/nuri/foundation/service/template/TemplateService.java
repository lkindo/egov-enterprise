package nuri.foundation.service.template;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.domain.template.Template;
import nuri.foundation.domain.template.TemplateRepository;
import nuri.foundation.service.template.dto.TemplateDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 템플릿 서비스 구현체
 */
@Service
@Transactional(readOnly = true)
public class TemplateService implements EgovTemplateService {

    private final TemplateRepository templateRepository;

    public TemplateService(
            @org.springframework.beans.factory.annotation.Qualifier("commonTemplateRepository") TemplateRepository templateRepository) {
        this.templateRepository = templateRepository;
    }

    @Override
    public Page<TemplateDto> getTemplateList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        if (keyword == null || keyword.isEmpty()) {
            return templateRepository.findAll(pageable).map(TemplateDto::from);
        }
        return templateRepository.findByTmpltNmContaining(keyword, pageable).map(TemplateDto::from);
    }

    @Override
    public Page<TemplateDto> getTemplatesByType(String tmplatSeCode, Pageable pageable) {
        return templateRepository.findByTmpltSeCd(tmplatSeCode, pageable).map(TemplateDto::from);
    }

    @Override
    public TemplateDto getTemplate(String tmplatId) {
        Template template = templateRepository.findById(Objects.requireNonNull(tmplatId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return TemplateDto.from(template);
    }

    @Override
    @Transactional
    public String createTemplate(String userId, TemplateDto dto) {
        String tmplatId = "TMPL_" + System.currentTimeMillis();

        Template template = Template.builder()
                .tmplatId(tmplatId)
                .tmplatNm(dto.getTmplatNm())
                .tmplatCours(dto.getTmplatCours())
                .tmplatSeCode(dto.getTmplatSeCode())
                .useYn(dto.getUseYn())
                .build();

        templateRepository.save(Objects.requireNonNull(template));
        return tmplatId;
    }

    @Override
    @Transactional
    public void updateTemplate(String tmplatId, String userId, TemplateDto dto) {
        Template template = templateRepository.findById(Objects.requireNonNull(tmplatId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        template.update(dto.getTmplatNm(), dto.getTmplatCours(), dto.getTmplatSeCode(),
                dto.getUseYn());
    }

    @Override
    @Transactional
    public void deleteTemplate(String tmplatId) {
        Template template = templateRepository.findById(Objects.requireNonNull(tmplatId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        templateRepository.delete(Objects.requireNonNull(template));
    }

    @Override
    public List<TemplateDto> getActiveTemplates() {
        return templateRepository.findByUseYn("Y").stream()
                .map(TemplateDto::from)
                .collect(Collectors.toList());
    }

    @Override
    public List<TemplateDto> getActiveTemplatesByType(String tmplatSeCode) {
        return templateRepository.findByTmpltSeCdAndUseYn(tmplatSeCode, "Y").stream()
                .map(TemplateDto::from)
                .collect(Collectors.toList());
    }
}
