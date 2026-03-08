package com.company.project.service.template;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.template.Template;
import com.company.project.domain.template.TemplateRepository;
import com.company.project.service.template.dto.TemplateDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import java.util.List;
import java.util.stream.Collectors;

/**
 * ??뵆????퉬???ы쁽?
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
        return templateRepository.findByTmplatNmContaining(keyword, pageable).map(TemplateDto::from);
    }

    @Override
    public Page<TemplateDto> getTemplatesByType(String tmplatSeCode, Pageable pageable) {
        return templateRepository.findByTmplatSeCode(tmplatSeCode, pageable).map(TemplateDto::from);
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
        String tmplatId = "TMPL_" + String.format("%013d", System.currentTimeMillis());

        Template template = Template.builder()
                .tmplatId(tmplatId)
                .tmplatNm(dto.getTmplatNm())
                .tmplatCours(dto.getTmplatCours())
                .tmplatSeCode(dto.getTmplatSeCode())
                .useAt(dto.getUseAt())
                .frstRegisterId(userId)
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
                dto.getUseAt(), userId);
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
        return templateRepository.findByUseAt("Y").stream()
                .map(TemplateDto::from)
                .collect(Collectors.toList());
    }

    @Override
    public List<TemplateDto> getActiveTemplatesByType(String tmplatSeCode) {
        return templateRepository.findByTmplatSeCodeAndUseAt(tmplatSeCode, "Y").stream()
                .map(TemplateDto::from)
                .collect(Collectors.toList());
    }
}
