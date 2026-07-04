package nuri.business.service.template;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.core.softdelete.DisableSoftDelete;
import nuri.business.domain.template.Template;
import nuri.business.domain.template.TemplateRepository;
import nuri.business.service.template.dto.TemplateDto;

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

    public TmplatInfoService(TemplateRepository templateRepository) {
        this.templateRepository = required(templateRepository, "TemplateRepository 는 null 일 수 없습니다");
    }

    @DisableSoftDelete
    public List<TemplateDto> selectTmplatInfoList() {
        return templateRepository.findAll().stream()
                .map(TemplateDto::from)
                .collect(Collectors.toList());
    }

    public List<TemplateDto> selectTmplatInfoListByType(String seCode) {
        return templateRepository.findByTmpltSeCd(seCode).stream()
                .map(TemplateDto::from)
                .collect(Collectors.toList());
    }

    @DisableSoftDelete
    public TemplateDto selectTmplatInfoDetail(String tmplatId) {
        Template template = templateRepository.findById(required(tmplatId, "템플릿 ID 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return TemplateDto.from(template);
    }

    @Transactional
    public void insertTmplatInfo(TemplateDto templateDto) {
        required(templateDto, "템플릿 정보는 null 일 수 없습니다");
        templateRepository.save(templateDto.toEntity());
    }

    @Transactional
    public void deleteTmplatInfo(String tmplatId) {
        // 물리삭제 금지(템플릿은 게시판/커뮤니티에서 참조) → 소프트삭제(use_yn='N').
        // 존재하지 않는 id 는 과거 deleteById() 와 동일하게 예외로 알린다(조용한 no-op 방지).
        templateRepository.findById(required(tmplatId, "템플릿 ID 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND))
                .delete();
    }
}
