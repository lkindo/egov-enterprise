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

    /**
     * 만족도 등록. 서비스 경계에서도 인증 주체를 재확인한다.
     *
     * <p>한 사람은 한 글에 평가 하나만 남긴다(2026-09-26 DIP I6 ⑤). 이미 남긴 평가가 있으면 409 이고,
     * 스스로(또는 관리자가) 지운 평가가 있으면 그 행을 새 점수·의견으로 되살린다 —
     * DB UNIQUE({@code uk_tb_dgstfn_info_pst_rgtr})가 삭제된 행도 세기 때문이다.</p>
     */
    @Transactional
    public Long createSatisfaction(SatisfactionDto dto) {
        String loginId = currentLoginId();
        java.util.Optional<Satisfaction> existing = satisfactionRepository
                .findByBbsIdAndPstSnAndFrstRgtrId(dto.getBbsId(), dto.getPstSn(), loginId);
        if (existing.isPresent()) {
            Satisfaction previous = existing.get();
            if ("Y".equals(previous.getUseYn())) {
                throw new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE,
                        "이미 이 게시글에 만족도를 남겼습니다. 남긴 평가를 수정해 주세요.");
            }
            previous.revive(dto.getDgstfnScr(), dto.getDgstfnCn());
            previous.setLastMdfrId(loginId);
            return previous.getDgstfnSn();
        }
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
        assertCanModify(entity, "SATISFY_UPDATE_ALL");
        entity.update(dto.getDgstfnScr(), dto.getDgstfnCn());
        entity.setLastMdfrId(userId);
    }

    /** 만족도 삭제(논리 삭제 — {@code use_yn='N'}). */
    @Transactional
    public void deleteSatisfaction(Long satisfactionId) {
        String userId = currentLoginId();
        Satisfaction entity = findOrThrow(satisfactionId);
        assertCanModify(entity, "SATISFY_DELETE_ALL");
        entity.delete();
        entity.setLastMdfrId(userId);
    }

    /**
     * 관리자 대리 삭제. 비밀번호 없이 지운다 — <b>호출부(컨트롤러)가 관리자 권한을 강제해야 한다.</b>
     * 일반 삭제 경로와 분리해 둔 이유는 위 클래스 주석 참조.
     */
    @Transactional
    public void deleteByModerator(Long satisfactionId) {
        SecurityUtil.assertPermission("SATISFY_MODERATE");
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

    /**
     * 평가가 경로의 게시판·게시글에 실제로 속하는지 본다. 다르거나 없으면 같은 404 다(2026-10-23 ADR-0040 A0).
     *
     * <p>종전 수정·삭제는 평가 번호로만 읽어, 읽을 수 있는 글의 경로에 다른 글(비밀글·회원 전용 게시판)의 평가 번호를
     * 붙여도 통과했다. 호출부는 경로의 글에 대한 열람 가드를 먼저 부른 뒤 이 판정을 부른다 — 순서를 바꾸면 404/403 차이로
     * 읽을 수 없는 글의 평가가 있는지 드러난다(댓글 DIP S8 과 같은 경계).
     */
    public void assertLocatedAt(Long satisfactionId, String bbsId, Long pstSn) {
        Satisfaction entity = findOrThrow(satisfactionId);
        if (!Objects.equals(entity.getBbsId(), bbsId) || !Objects.equals(entity.getPstSn(), pstSn)) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
    }

    public SatisfactionDto getSatisfaction(Long satisfactionId) {
        return satisfactionMapper.toDto(findOrThrow(satisfactionId));
    }

    private Satisfaction findOrThrow(Long satisfactionId) {
        return satisfactionRepository.findById(Objects.requireNonNull(satisfactionId))
                .filter(entity -> "Y".equals(entity.getUseYn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    /**
     * 수정·삭제 권한 검사. 작성자 감사 값이 없는 레거시 행은 관리자도 일반 경로로 변경하지 못한다.
     * 그런 행의 정리는 명시적인 moderation 경로만 허용한다.
     */
    private void assertCanModify(Satisfaction entity, String overridePermission) {
        if (!StringUtils.hasText(entity.getFrstRgtrId())) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }
        SecurityUtil.assertOwnerOrPermission(entity.getFrstRgtrId(), overridePermission);
    }

    private String currentLoginId() {
        return SecurityUtil.getCurrentLoginId()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ACCESS_DENIED));
    }
}
