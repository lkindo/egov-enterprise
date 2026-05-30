package nuri.business.service.template;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.template.Template;
import nuri.business.domain.template.TemplateRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * 템플릿 정보 서비스
 */
@Service("egovTemplateService")
@Transactional(readOnly = true)
public class TmplatInfoService extends BaseAbstractService {

    private final TemplateRepository templateRepository;

    public TmplatInfoService(TemplateRepository templateRepository) {
        this.templateRepository = required(templateRepository, "TemplateRepository 는 null 일 수 없습니다");
    }

    public List<Template> selectTmplatInfoList() {
        return templateRepository.findAll();
    }

    public List<Template> selectTmplatInfoListByType(String seCode) {
        return templateRepository.findByTmpltSeCd(seCode);
    }

    public Template selectTmplatInfoDetail(String tmplatId) {
        return templateRepository.findById(required(tmplatId, "템플릿 ID 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public void insertTmplatInfo(Template template) {
        templateRepository.save(required(template, "템플릿 정보는 null 일 수 없습니다"));
    }

    @Transactional
    public void deleteTmplatInfo(String tmplatId) {
        templateRepository.deleteById(required(tmplatId, "템플릿 ID 는 null 일 수 없습니다"));
    }
}
