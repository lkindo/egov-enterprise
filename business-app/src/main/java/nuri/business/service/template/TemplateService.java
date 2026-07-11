package nuri.business.service.template;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.template.Template;
import nuri.business.domain.template.TemplateRepository;
import nuri.business.service.template.dto.TemplateDto;
import nuri.business.service.template.dto.TemplateMapper;
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
    private final TemplateMapper templateMapper;

    public TemplateService(
            @org.springframework.beans.factory.annotation.Qualifier("commonTemplateRepository") TemplateRepository templateRepository,
            TemplateMapper templateMapper) {
        this.templateRepository = templateRepository;
        this.templateMapper = templateMapper;
    }

    @Override
    public Page<TemplateDto> getTemplateList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        if (keyword == null || keyword.isEmpty()) {
            return templateRepository.findAll(pageable).map(templateMapper::toDto);
        }
        return templateRepository.findByTmpltNmContaining(keyword, pageable).map(templateMapper::toDto);
    }

    @Override
    public Page<TemplateDto> getTemplatesByType(String tmpltSeCd, Pageable pageable) {
        return templateRepository.findByTmpltSeCd(tmpltSeCd, pageable).map(templateMapper::toDto);
    }

    @Override
    public TemplateDto getTemplate(String tmpltId) {
        Template template = templateRepository.findById(Objects.requireNonNull(tmpltId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        return templateMapper.toDto(template);
    }

    @Override
    @Transactional
    public String createTemplate(String userId, TemplateDto dto) {
        String tmpltId = "TMPL_" + System.currentTimeMillis();

        Template template = Template.builder()
                .tmpltId(tmpltId)
                .tmpltNm(dto.getTmpltNm())
                .tmpltPath(dto.getTmpltPath())
                .tmpltSeCd(dto.getTmpltSeCd())
                .useYn(dto.getUseYn())
                .build();

        templateRepository.save(Objects.requireNonNull(template));
        return tmpltId;
    }

    @Override
    @Transactional
    public void updateTemplate(String tmpltId, String userId, TemplateDto dto) {
        Template template = templateRepository.findById(Objects.requireNonNull(tmpltId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        template.update(dto.getTmpltNm(), dto.getTmpltSeCd(), dto.getTmpltPath(),
                dto.getUseYn());
    }

    @Override
    @Transactional
    public void deleteTemplate(String tmpltId) {
        Template template = templateRepository.findById(Objects.requireNonNull(tmpltId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        templateRepository.delete(Objects.requireNonNull(template));
    }

    @Override
    public List<TemplateDto> getActiveTemplates() {
        return templateRepository.findByUseYn("Y").stream()
                .map(templateMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<TemplateDto> getActiveTemplatesByType(String tmpltSeCd) {
        return templateRepository.findByTmpltSeCdAndUseYn(tmpltSeCd, "Y").stream()
                .map(templateMapper::toDto)
                .collect(Collectors.toList());
    }
}
