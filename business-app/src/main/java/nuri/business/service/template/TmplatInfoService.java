package nuri.business.service.template;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.template.Template;
import nuri.business.domain.template.TemplateRepository;
import nuri.business.service.template.dto.TemplateDto;
import nuri.business.service.template.dto.TemplateMapper;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 템플릿 정보 서비스
 */
@Service("egovTemplateService")
@Transactional(readOnly = true)
public class TmplatInfoService extends BaseAbstractService {

    private final TemplateRepository templateRepository;
    private final TemplateMapper templateMapper;

    public TmplatInfoService(TemplateRepository templateRepository, TemplateMapper templateMapper) {
        this.templateRepository = required(templateRepository, "TemplateRepository 는 null 일 수 없습니다");
        this.templateMapper = required(templateMapper, "TemplateMapper 는 null 일 수 없습니다");
    }

    public List<TemplateDto> selectTmplatInfoList() {
        return templateRepository.findAll().stream()
                .map(templateMapper::toDto)
                .collect(Collectors.toList());
    }

    public List<TemplateDto> selectTmplatInfoListByType(String seCode) {
        return templateRepository.findByTmpltSeCd(seCode).stream()
                .map(templateMapper::toDto)
                .collect(Collectors.toList());
    }

    public TemplateDto selectTmplatInfoDetail(String tmplatId) {
        Template template = templateRepository.findById(required(tmplatId, "템플릿 ID 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        return templateMapper.toDto(template);
    }

    @Transactional
    public void insertTmplatInfo(TemplateDto templateDto) {
        required(templateDto, "템플릿 정보는 null 일 수 없습니다");
        templateRepository.save(templateDto.toEntity());
    }

    @Transactional
    public void deleteTmplatInfo(String tmplatId) {
        templateRepository.deleteById(required(tmplatId, "템플릿 ID 는 null 일 수 없습니다"));
    }
}
