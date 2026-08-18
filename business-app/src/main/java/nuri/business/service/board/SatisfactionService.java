package nuri.business.service.board;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.board.Satisfaction;
import nuri.business.domain.board.SatisfactionRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.board.dto.SatisfactionDto;
import nuri.business.service.board.dto.SatisfactionMapper;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;

/**
 * 게시글 만족도(`tb_dgstfn_info`) 서비스.
 *
 * <p><b>⚠ 2026-08-06 인가 결함 3건 수정.</b> 이 서비스는 완성돼 있었지만 컨트롤러가 없어
 * 도달 불가였고, 그 덕분에 아래 결함이 노출되지 않고 있었다. 배선 전에 먼저 고친다.
 * <ol>
 *   <li>{@code deleteSatisfaction(id, userId, pswd)} 가 <b>{@code pswd} 를 받고도 검사하지 않았다</b> —
 *       ID만 알면 누구나 남의 만족도를 삭제할 수 있었다. D-4 에서 {@code srvyId} 를 받고 버리던 것과
 *       같은 결함 유형이다(파라미터를 받아 무시).</li>
 *   <li>{@code updateSatisfaction} 도 소유권·비밀번호를 전혀 확인하지 않았다 — 점수와 내용을
 *       임의로 바꿀 수 있었다.</li>
 *   <li>비밀번호를 <b>평문으로 저장</b>하고 {@code Objects.equals} 로 비교했다(해싱 없음·타이밍
 *       비안전). 물리 테이블이 <b>0행</b>이라(실측 2026-08-06) 해싱 전환에 마이그레이션이 필요 없다.</li>
 * </ol>
 *
 * <p><b>소유 증명은 두 경로다</b>(AGENTS.md Evidence guardrails H3 — 도메인 맥락 판정).
 * 로그인 작성분은 {@code frstRgtrId} 기준 소유자/관리자, 익명 작성분은 비밀번호가 유일한 증명이다.
 * 익명 항목에 관리자 대리 삭제가 필요한 경우가 있어(욕설·스팸 정리) 그 경로는
 * {@link #deleteByModerator}로 <b>분리·명시</b>했다 — 일반 삭제 경로에 관리자 우회를 섞으면
 * 비밀번호 검증이 사실상 무의미해진다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SatisfactionService {

    private final SatisfactionRepository satisfactionRepository;
    private final SatisfactionMapper satisfactionMapper;
    private final PasswordEncoder passwordEncoder;

    /**
     * 만족도 등록.
     *
     * @param userId 로그인 사용자 ID. {@code null}/공백이면 익명 작성으로 보고 비밀번호를 요구한다.
     */
    @Transactional
    public Long createSatisfaction(String userId, SatisfactionDto dto) {
        boolean anonymous = !StringUtils.hasText(userId);
        if (anonymous && !StringUtils.hasText(dto.getPswd())) {
            throw new BusinessException("익명 작성에는 비밀번호가 필요합니다.", CommonErrorCode.INVALID_INPUT_VALUE);
        }
        Satisfaction entity = Satisfaction.builder()
                .bbsId(dto.getBbsId())
                .pstSn(dto.getPstSn())
                .dgstfnScr(dto.getDgstfnScr())
                .dgstfnCn(dto.getDgstfnCn())
                // 평문 저장 금지. 저장소 표준 인코더(bcrypt, DelegatingPasswordEncoder)를 쓴다.
                .pswd(StringUtils.hasText(dto.getPswd()) ? passwordEncoder.encode(dto.getPswd()) : null)
                .build();
        // frstRgtrId 는 표준 Auditing(@CreatedBy)이 설정하므로 빌더에서 제외
        return satisfactionRepository.save(entity).getDgstfnSn();
    }

    /**
     * 만족도 수정. {@code dto.pswd} 는 <b>소유 증명용 자격</b>이며 저장된 비밀번호를 바꾸지 않는다
     * — 검증에 쓰는 값과 새로 저장할 값을 같은 필드로 겸하면 둘을 구분할 수 없다.
     */
    @Transactional
    public void updateSatisfaction(String userId, SatisfactionDto dto) {
        Satisfaction entity = findOrThrow(Objects.requireNonNull(dto.getDgstfnSn()));
        assertCanModify(entity, dto.getPswd());
        entity.update(dto.getDgstfnScr(), dto.getDgstfnCn(), null);
        entity.setLastMdfrId(userId);
    }

    /** 만족도 삭제(논리 삭제 — {@code use_yn='N'}). */
    @Transactional
    public void deleteSatisfaction(Long satisfactionId, String userId, String pswd) {
        Satisfaction entity = findOrThrow(satisfactionId);
        assertCanModify(entity, pswd);
        entity.delete();
        entity.setLastMdfrId(userId);
    }

    /**
     * 관리자 대리 삭제. 비밀번호 없이 지운다 — <b>호출부(컨트롤러)가 관리자 권한을 강제해야 한다.</b>
     * 일반 삭제 경로와 분리해 둔 이유는 위 클래스 주석 참조.
     */
    @Transactional
    public void deleteByModerator(Long satisfactionId, String moderatorId) {
        SecurityUtil.assertAdmin();
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

    /** 비밀번호 확인. 해시 비교이며 {@link PasswordEncoder#matches} 가 타이밍 안전 비교를 보장한다. */
    public boolean checkPassword(Long satisfactionId, String pswd) {
        return satisfactionRepository.findById(satisfactionId)
                .map(s -> StringUtils.hasText(s.getPswd())
                        && StringUtils.hasText(pswd)
                        && passwordEncoder.matches(pswd, s.getPswd()))
                .orElse(false);
    }

    private Satisfaction findOrThrow(Long satisfactionId) {
        return satisfactionRepository.findById(Objects.requireNonNull(satisfactionId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    /**
     * 수정·삭제 권한 검사. 로그인 작성분은 소유자/관리자, 익명 작성분은 비밀번호로 판정한다.
     *
     * <p>두 경로 중 <b>어느 쪽도 성립하지 않으면 거부</b>한다. 종전에는 이 검사 자체가 없었다.
     */
    private void assertCanModify(Satisfaction entity, String pswd) {
        if (StringUtils.hasText(entity.getFrstRgtrId())) {
            // 로그인 작성분: 소유자 본인 또는 관리자. (실패 시 SecurityUtil 이 예외를 던진다)
            SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId());
            return;
        }
        if (StringUtils.hasText(entity.getPswd())
                && StringUtils.hasText(pswd)
                && passwordEncoder.matches(pswd, entity.getPswd())) {
            return;
        }
        throw new BusinessException("본인 확인에 실패했습니다.", CommonErrorCode.HANDLE_ACCESS_DENIED);
    }
}
