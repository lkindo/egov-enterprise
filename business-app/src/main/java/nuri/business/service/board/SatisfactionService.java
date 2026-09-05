package nuri.business.service.board;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.board.Satisfaction;
import nuri.business.domain.board.SatisfactionRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.board.dto.SatisfactionDto;
import nuri.business.service.board.dto.SatisfactionMapper;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;

/**
 * 게시글 만족도(`tb_dgstfn_info`) 서비스.
 *
 * <p>만족도 작성은 인증 사용자 전용이며 수정·일반 삭제는 감사 컬럼({@code frstRgtrId}) 기준
 * owner-or-admin 으로 재검증한다. 익명 비밀번호 자격은 지원하지 않는다. 작성자가 없는 레거시 행은
 * 일반 경로에서 fail-closed 하고, 관리자 moderation 경로로만 정리할 수 있다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SatisfactionService {

    private final SatisfactionRepository satisfactionRepository;
    private final SatisfactionMapper satisfactionMapper;

    /** 만족도 등록. 서비스 경계에서도 인증 주체를 재확인한다. */
    @Transactional
    public Long createSatisfaction(SatisfactionDto dto) {
        currentLoginId();
        Satisfaction entity = Satisfaction.builder()
                .bbsId(dto.getBbsId())
                .pstSn(dto.getPstSn())
                .dgstfnScr(dto.getDgstfnScr())
                .dgstfnCn(dto.getDgstfnCn())
                .build();
        // frstRgtrId 는 표준 Auditing(@CreatedBy)이 설정하므로 빌더에서 제외
        return satisfactionRepository.save(entity).getDgstfnSn();
    }

    /** 만족도 수정. 작성자 또는 관리자만 허용한다. */
    @Transactional
    public void updateSatisfaction(SatisfactionDto dto) {
        String userId = currentLoginId();
        Satisfaction entity = findOrThrow(Objects.requireNonNull(dto.getDgstfnSn()));
        assertCanModify(entity);
        entity.update(dto.getDgstfnScr(), dto.getDgstfnCn());
        entity.setLastMdfrId(userId);
    }

    /** 만족도 삭제(논리 삭제 — {@code use_yn='N'}). */
    @Transactional
    public void deleteSatisfaction(Long satisfactionId) {
        String userId = currentLoginId();
        Satisfaction entity = findOrThrow(satisfactionId);
        assertCanModify(entity);
        entity.delete();
        entity.setLastMdfrId(userId);
    }

    /**
     * 관리자 대리 삭제. 비밀번호 없이 지운다 — <b>호출부(컨트롤러)가 관리자 권한을 강제해야 한다.</b>
     * 일반 삭제 경로와 분리해 둔 이유는 위 클래스 주석 참조.
     */
    @Transactional
    public void deleteByModerator(Long satisfactionId) {
        SecurityUtil.assertAdmin();
        String moderatorId = currentLoginId();
        Satisfaction entity = findOrThrow(satisfactionId);
        entity.delete();
        entity.setLastMdfrId(moderatorId);
    }

    public List<SatisfactionDto> getSatisfactionList(String bbsId, Long pstSn) {
        return satisfactionRepository.findByPstSnAndBbsIdAndUseYn(pstSn, bbsId, "Y").stream()
                .map(satisfactionMapper::toDto)
                .toList();
    }

    public Double getAverageSatisfaction(String bbsId, Long pstSn) {
        return satisfactionRepository.getAverageSatisfaction(pstSn, bbsId);
    }

    public SatisfactionDto getSatisfaction(Long satisfactionId) {
        return satisfactionMapper.toDto(findOrThrow(satisfactionId));
    }

    private Satisfaction findOrThrow(Long satisfactionId) {
        return satisfactionRepository.findById(Objects.requireNonNull(satisfactionId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    /**
     * 수정·삭제 권한 검사. 작성자 감사 값이 없는 레거시 행은 관리자도 일반 경로로 변경하지 못한다.
     * 그런 행의 정리는 명시적인 moderation 경로만 허용한다.
     */
    private void assertCanModify(Satisfaction entity) {
        if (!StringUtils.hasText(entity.getFrstRgtrId())) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }
        SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId());
    }

    private String currentLoginId() {
        return SecurityUtil.getCurrentLoginId()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ACCESS_DENIED));
    }
}
