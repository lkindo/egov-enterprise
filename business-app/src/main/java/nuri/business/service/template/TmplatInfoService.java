package nuri.business.service.template;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.template.Template;
import nuri.business.domain.template.TemplateRepository;
import nuri.business.service.template.dto.TemplateDto;
import nuri.business.service.template.dto.TemplateMapper;
import nuri.foundation.core.template.TemplateReferenceContributor;

import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
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
    /** 템플릿을 참조하는 도메인(게시판·블로그)이 등록한 참조 건수 포트. 참조 도메인이 projection 에서 빠지면 비어 있다. */
    private final List<TemplateReferenceContributor> referenceContributors;

    public TmplatInfoService(TemplateRepository templateRepository, TemplateMapper templateMapper,
                             @Nullable List<TemplateReferenceContributor> referenceContributors) {
        this.templateRepository = required(templateRepository, "TemplateRepository 는 null 일 수 없습니다");
        this.templateMapper = required(templateMapper, "TemplateMapper 는 null 일 수 없습니다");
        this.referenceContributors = referenceContributors == null ? List.of() : List.copyOf(referenceContributors);
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
     * tb_bbs_master.tmplt_id·tb_blog_info.tmplt_id 는 물리 FK 없이 문자열로 참조한다(V2_0) — DB 는 막지 않으므로
     * 참조 도메인이 등록한 {@link TemplateReferenceContributor} 로 건수를 물어 하나라도 있으면 RESOURCE_IN_USE(409) 로
     * 거부한다(2026-09-06 감사 D11-02 후속). 게시판·블로그 도메인을 직접 import 하지 않는 이유는 GAP-ARCH-001 결합 동결이다.
     */
    @Transactional
    public void deleteTmplatInfo(String tmplatId) {
        Template template = templateRepository.findById(required(tmplatId, "템플릿 ID 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        assertNotReferenced(template.getTmpltId());
        templateRepository.delete(template);
    }

    private void assertNotReferenced(String tmpltId) {
        List<String> inUse = new ArrayList<>();
        for (TemplateReferenceContributor contributor : referenceContributors) {
            long count = contributor.countReferences(tmpltId);
            if (count > 0) {
                inUse.add(contributor.sourceLabel() + " " + count + "건");
            }
        }
        if (!inUse.isEmpty()) {
            throw new BusinessException(
                    String.join(", ", inUse) + "이 이 템플릿을 사용 중이라 삭제할 수 없습니다. 참조를 먼저 다른 템플릿으로 바꿔 주세요.",
                    CommonErrorCode.RESOURCE_IN_USE);
        }
    }
}
