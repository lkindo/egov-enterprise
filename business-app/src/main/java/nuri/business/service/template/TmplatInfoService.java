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
@Service
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

    /** 템플릿 수정 — ID 는 바꾸지 않는다(2026-09-05 DEC-OPS-036 — 종전에는 등록·조회만 가능했다, 감사 D11-02). */
    @Transactional
    public TemplateDto updateTmplatInfo(String tmplatId, TemplateDto templateDto) {
        required(templateDto, "템플릿 정보는 null 일 수 없습니다");
        Template template = templateRepository.findById(required(tmplatId, "템플릿 ID 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        template.update(templateDto.getTmpltNm(), templateDto.getTmpltSeCd(), templateDto.getTmpltPath(), templateDto.getUseYn());
        return templateMapper.toDto(template);
    }

    /**
     * 템플릿 삭제. 없는 대상은 RESOURCE_NOT_FOUND 다 — 종전 {@code deleteById} 는 없는 ID 도 조용히 성공했다.
     * ⚠ tb_bbs_master.tmplt_id·tb_blog_info.tmplt_id 는 물리 FK 없이 문자열로 참조한다(V2_0). 참조 중인 템플릿을
     *   지워도 DB 는 막지 않으며 게시판은 서식 ID 만 남긴다 — 참조 차단은 board/blog 도메인 결합이 필요해 이번 범위 밖이다.
     */
    @Transactional
    public void deleteTmplatInfo(String tmplatId) {
        Template template = templateRepository.findById(required(tmplatId, "템플릿 ID 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        templateRepository.delete(template);
    }
}
