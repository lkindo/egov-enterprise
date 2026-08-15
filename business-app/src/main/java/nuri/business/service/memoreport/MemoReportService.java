package nuri.business.service.memoreport;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.memoreport.MemoReport;
import nuri.business.domain.memoreport.MemoReportRepository;
import nuri.business.service.memoreport.dto.MemoReportDto;
import nuri.business.service.memoreport.dto.MemoReportMapper;
import nuri.foundation.core.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemoReportService {

    private final MemoReportRepository memoReportRepository;
    private final MemoReportMapper memoReportMapper;

    /**
     * 조직 전체 메모보고 목록 — <b>관리자 전용</b>.
     *
     * <p>종전에는 인가 없이 {@code findAll} 을 반환해, 로그인만 하면 누구나 조직 전체의 비정형 보고를
     * 열람할 수 있었다. 컨트롤러의 {@code @PreAuthorize("hasRole('ADMIN')")} 와 짝을 이루는
     * 서비스 레이어 2차 검증을 둔다. — 백엔드 헌법 제8조(이중 검증)</p>
     *
     * <p>일반 사용자는 {@code /my}(작성) · {@code /received}(수신) 경로를 쓴다.</p>
     */
    public Page<MemoReportDto> getMemoReportList(String keyword, @NonNull Pageable pageable) {
        Objects.requireNonNull(pageable);
        nuri.business.security.util.SecurityUtil.assertAdmin();
        // 검색어를 받고도 무시하던 default 구현(findAll)을 실제 제목 검색으로 대체했다.
        return memoReportRepository.searchByTitle(keyword != null ? keyword : "", pageable)
                .map(memoReportMapper::toDto);
    }

    public Page<MemoReportDto> getMyReportList(String writerId, @NonNull Pageable pageable) {
        return memoReportRepository.findByUserId(writerId, Objects.requireNonNull(pageable))
                .map(memoReportMapper::toDto);
    }

    public Page<MemoReportDto> getReceivedReportList(String rptUserId, @NonNull Pageable pageable) {
        return memoReportRepository.findByRptrId(rptUserId, Objects.requireNonNull(pageable))
                .map(memoReportMapper::toDto);
    }

    public MemoReportDto getMemoReport(@NonNull Long memoRptSn) {
        MemoReport entity = memoReportRepository.findById(memoRptSn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        assertParticipantOrAdmin(entity); // [IDOR] 작성자·수신자·관리자만 열람
        return memoReportMapper.toDto(entity);
    }

    /**
     * 메모보고 열람 권한 검증. 작성자({@code userId}) 또는 수신자({@code rptrId}) 또는 관리자만 통과한다.
     *
     * <p>표준 가드 {@code SecurityUtil.assertOwnerOrAdmin} 은 loginId(=frstRgtrId) 축이라 여기서는 쓸 수 없다.
     * 메모보고의 참여자 필드는 {@code createMemoReport} 가 principal 의 {@code getUsername()} 을 저장하므로
     * <b>esntlId</b> 축이며, loginId 로 비교하면 수신자가 자기 앞으로 온 보고를 열지 못하는 오탐이 난다.</p>
     */
    private void assertParticipantOrAdmin(MemoReport entity) {
        if (nuri.business.security.util.SecurityUtil.hasRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN)
                || nuri.business.security.util.SecurityUtil
                        .hasRole(nuri.business.security.AuthorityConstants.ROLE_SYSTEM)) {
            return;
        }
        String esntlId = currentEsntlIdOrDeny();
        if (!esntlId.equals(entity.getUserId()) && !esntlId.equals(entity.getRptrId())) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }
    }

    /** 현재 주체의 esntlId. 인증 정보가 없으면 조회를 허용하지 않는다(fail-closed). */
    private String currentEsntlIdOrDeny() {
        return nuri.business.security.util.SecurityUtil.getCurrentEsntlId()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ACCESS_DENIED));
    }

    @Transactional
    public Long createMemoReport(String userId, MemoReportDto dto) {
        MemoReport entity = MemoReport.builder()
                .rptTtl(dto.getRptTtl())
                .memoRptYmd(dto.getMemoRptYmd())
                .userId(userId)
                .rptrId(dto.getRptrId())
                .rptCn(dto.getRptCn())
                .atchFileSn(dto.getAtchFileSn())
                .build();
        return memoReportRepository.save(entity).getMemoRptSn();
    }

    @Transactional
    public void updateMemoReport(Long memoRptSn, String userId, MemoReportDto dto) {
        MemoReport entity = memoReportRepository.findById(Objects.requireNonNull(memoRptSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 작성자/관리자만 수정
        entity.update(dto.getRptTtl(), dto.getMemoRptYmd(), entity.getUserId(), dto.getRptrId(),
                dto.getRptCn(), dto.getAtchFileSn());
        entity.setLastMdfrId(userId);
    }

    @Transactional
    public void deleteMemoReport(@NonNull Long memoRptSn) {
        MemoReport entity = memoReportRepository.findById(memoRptSn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 작성자/관리자만 삭제
        memoReportRepository.delete(entity);
    }

    @Transactional
    public void readMemoReport(@NonNull Long memoRptSn) {
        memoReportRepository.findById(memoRptSn).ifPresent(entity -> {
            assertParticipantOrAdmin(entity); // 열람 표시도 권한자만 — 미인가 요청이 조회일시를 갱신하지 못하게 한다
            entity.updateInqireDt(java.time.LocalDateTime.now());
        });
    }

    @Transactional
    public void updateDrctMatter(Long memoRptSn, String instrCn) {
        MemoReport entity = memoReportRepository.findById(memoRptSn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        assertParticipantOrAdmin(entity); // [IDOR] 타인의 보고에 지시사항을 남길 수 없다
        entity.updateDrctMatter(instrCn, java.time.LocalDateTime.now());
    }
}
