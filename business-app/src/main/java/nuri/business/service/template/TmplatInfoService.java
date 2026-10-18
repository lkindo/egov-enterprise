package nuri.business.service.template;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.template.Template;
import nuri.business.domain.template.TemplateRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.template.dto.TemplateDto;
import nuri.business.service.template.dto.TemplateMapper;
import nuri.foundation.core.template.AssignableTemplate;
import nuri.foundation.core.template.TemplateAssignmentPolicy;
import nuri.foundation.core.template.TemplateReferenceContributor;

import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 템플릿 정보 서비스.
 *
 * <p>커뮤니티가 쓰는 템플릿 배정 포트({@link TemplateAssignmentPolicy})도 이 서비스가 구현한다(DEC-OPS-280). 종전에는 템플릿
 * 디렉터리의 별도 구현을 커뮤니티 지원 파일로 묶어 커뮤니티가 템플릿 기능을 늘 끌어왔다. 이제 템플릿 기능이 빠지면 구현도
 * 함께 빠지고 커뮤니티는 포트가 없는 것으로 판정한다. 템플릿만 고른 구성에서도 이 서비스는 템플릿 API 가 쓰므로 소비자 없는
 * 구현이 남지 않는다.
 */
@Service
@Transactional(readOnly = true)
public class TmplatInfoService extends BaseAbstractService implements TemplateAssignmentPolicy {

    private final TemplateRepository templateRepository;
    private final TemplateMapper templateMapper;
    /** 템플릿을 참조하는 도메인이 등록한 참조 건수 포트. 참조 도메인이 projection 에서 빠지면 비어 있다. */
    private final List<TemplateReferenceContributor> referenceContributors;

    public TmplatInfoService(TemplateRepository templateRepository, TemplateMapper templateMapper,
                             @Nullable List<TemplateReferenceContributor> referenceContributors) {
        this.templateRepository = required(templateRepository, "TemplateRepository 는 null 일 수 없습니다");
        this.templateMapper = required(templateMapper, "TemplateMapper 는 null 일 수 없습니다");
        this.referenceContributors = referenceContributors == null ? List.of() : List.copyOf(referenceContributors);
    }

    private static final Comparator<Template> TEMPLATE_ORDER = Comparator
            .comparing((Template template) -> Objects.requireNonNullElse(template.getTmpltNm(), ""))
            .thenComparing(Template::getTmpltId, Comparator.nullsLast(Comparator.naturalOrder()));

    public List<TemplateDto> selectTmplatInfoList() {
        return templateRepository.findAll().stream()
                .sorted(TEMPLATE_ORDER)
                .map(templateMapper::toDto)
                .collect(Collectors.toList());
    }

    /** 원장 행을 잠그고 존재하는 사용 중 템플릿인지 확인한다. 새로 지정하는 쓰기 트랜잭션 안에서만 부른다. */
    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void assertActiveForAssignment(String templateId) {
        templateRepository.findByIdForUpdate(templateId).filter(template -> "Y".equals(template.getUseYn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                        "존재하는 사용 중 템플릿을 선택해 주세요."));
    }

    /**
     * 새로 지정할 수 있는 사용 중 템플릿(이름 순). 종전 관리 창은 템플릿 관리 목록(TEMPLATE_READ)을 받아 화면에서 걸렀다 —
     * 같은 권한을 여기서 다시 요구해 후보를 보는 주체가 바뀌지 않게 한다(H3).
     */
    @Override
    public List<AssignableTemplate> assignableTemplates() {
        SecurityUtil.assertPermission("TEMPLATE_READ");
        return templateRepository.findAll().stream()
                .filter(template -> template.getTmpltId() != null && "Y".equals(template.getUseYn()))
                .sorted(TEMPLATE_ORDER)
                .map(template -> new AssignableTemplate(template.getTmpltId(), template.getTmpltNm()))
                .toList();
    }

    public TemplateDto selectTmplatInfoDetail(String tmplatId) {
        Template template = templateRepository.findById(required(tmplatId, "템플릿 ID 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        return templateMapper.toDto(template);
    }

    @Transactional
    public void insertTmplatInfo(TemplateDto templateDto) {
        SecurityUtil.assertPermission("TEMPLATE_CREATE");
        required(templateDto, "템플릿 정보는 null 일 수 없습니다");
        String tmpltId = required(templateDto.getTmpltId(), "템플릿 ID 는 null 일 수 없습니다");
        if (templateRepository.existsById(tmpltId)) {
            throw new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE, "이미 등록된 템플릿 ID입니다.");
        }
        // The pre-check gives an immediate conflict; INSERT also protects against concurrent creation.
        templateRepository.insert(templateDto.toEntity());
    }

    /** 템플릿 수정 — ID 는 바꾸지 않는다(2026-09-05 DEC-OPS-036 — 종전에는 등록·조회만 가능했다, 감사 D11-02). */
    @Transactional
    public TemplateDto updateTmplatInfo(String tmplatId, TemplateDto templateDto) {
        SecurityUtil.assertPermission("TEMPLATE_UPDATE");
        required(templateDto, "템플릿 정보는 null 일 수 없습니다");
        Template template = templateRepository.findByIdForUpdate(required(tmplatId, "템플릿 ID 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        template.update(templateDto.getTmpltNm(), templateDto.getTmpltSeCd(), templateDto.getTmpltPath(), templateDto.getUseYn());
        return templateMapper.toDto(template);
    }

    /**
     * 템플릿 삭제. 없는 대상은 RESOURCE_NOT_FOUND 다 — 종전 {@code deleteById} 는 없는 ID 도 조용히 성공했다.
     * tb_bbs_master.tmplt_id 는 물리 FK 없이 문자열로 참조한다(V2_0) — DB 는 막지 않으므로
     * 참조 도메인이 등록한 {@link TemplateReferenceContributor} 로 건수를 물어 하나라도 있으면 RESOURCE_IN_USE(409) 로
     * 거부한다(2026-09-06 감사 D11-02 후속). 게시판 도메인을 직접 import 하지 않는 이유는 GAP-ARCH-001 결합 동결이다.
     */
    @Transactional
    public void deleteTmplatInfo(String tmplatId) {
        SecurityUtil.assertPermission("TEMPLATE_DELETE");
        Template template = templateRepository.findByIdForUpdate(required(tmplatId, "템플릿 ID 는 null 일 수 없습니다"))
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
