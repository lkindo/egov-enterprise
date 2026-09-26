package nuri.business.service.memoreport;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.memoreport.MemoReport;
import nuri.business.domain.memoreport.MemoReportRepository;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.memoreport.dto.MemoReportDto;
import nuri.business.service.memoreport.dto.MemoReportMapper;
import nuri.foundation.core.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.jspecify.annotations.NonNull;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemoReportService {

    private final MemoReportRepository memoReportRepository;
    private final MemoReportMapper memoReportMapper;
    private final AttachmentAssignmentPolicy attachmentAssignmentPolicy;

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
        nuri.business.security.util.SecurityUtil.assertPermission("MEMO_RPT_READ_ALL");
        // 검색어를 받고도 무시하던 default 구현(findAll)을 실제 제목 검색으로 대체했다.
        return memoReportRepository.searchByTitle(keyword != null ? keyword : "", newestFirst(pageable))
                .map(this::toDtoWithPermission);
    }

    /**
     * 발신함. 검색어가 있으면 제목으로 좁힌다.
     *
     * <p>[2026-08-29] 종전에는 검색어를 받는 경로 자체가 없어 화면의 조회 조건이 무동작이었다.
     * 소유 스코프(userId)는 그대로 두고 제목 조건만 더한다 — 인가 범위는 넓어지지 않는다.
     */
    public Page<MemoReportDto> getMyReportList(String writerId, String keyword, @NonNull Pageable pageable) {
        Objects.requireNonNull(pageable);
        Page<MemoReport> page = hasKeyword(keyword)
                ? memoReportRepository.findByUserIdAndRptTtlContaining(writerId, keyword.trim(), newestFirst(pageable))
                : memoReportRepository.findByUserId(writerId, newestFirst(pageable));
        return page.map(this::toDtoWithPermission);
    }

    /** 수신함. 발신함과 같은 이유로 제목 검색을 지원한다(소유 스코프는 rptrId 로 유지). */
    public Page<MemoReportDto> getReceivedReportList(String rptUserId, String keyword, @NonNull Pageable pageable) {
        Objects.requireNonNull(pageable);
        Page<MemoReport> page = hasKeyword(keyword)
                ? memoReportRepository.findByRptrIdAndRptTtlContaining(rptUserId, keyword.trim(), newestFirst(pageable))
                : memoReportRepository.findByRptrId(rptUserId, newestFirst(pageable));
        return page.map(this::toDtoWithPermission);
    }

    /**
     * [2026-09-26 DIP C7] 정렬 없는 페이지 조회는 DB 가 순서를 보장하지 않는다 — 페이지를 넘기면 같은 보고가 두 번
     * 보이거나 빠질 수 있었다. 요청이 정렬을 주지 않으면 최신순(일련번호 역순)으로 둔다.
     */
    private static Pageable newestFirst(Pageable pageable) {
        return pageable.getSort().isSorted() ? pageable
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "memoRptSn"));
    }

    private static boolean hasKeyword(String keyword) {
        return keyword != null && !keyword.trim().isEmpty();
    }

    /**
     * 현재 주체가 이 보고를 수정·삭제할 수 있는지 — {@code updateMemoReport}·{@code deleteMemoReport}
     * 의 기능 권한과 {@code assertOwnerOrPermission} 소유·전체 권한 규칙을
     * 예외 대신 boolean 으로 계산한다.
     *
     * <p>[2026-09-08 PD-RPT-001] 화면이 인가를 흉내내지 않게 하려고 판정을 서버에 둔다. 그 인가는
     * loginId 축(감사 컬럼 {@code frstRgtrId})인데 같은 도메인의 열람 인가는 esntlId 축
     * ({@code userId}·{@code rptrId})이라, 화면은 응답만 보고 판정할 수 없었다.
     *
     * <p>⚠ 이 값은 <b>표시용 힌트</b>이고 인가 자체가 아니다. 실제 차단은 쓰기 경로의
     * {@code assertOwnerOrPermission} 과 컨트롤러 기능 권한이 그대로 집행한다(백엔드 헌법 제8조 — 이중 검증).
     */
    private boolean canModify(MemoReport entity, String operationPermission, String overridePermission) {
        if (!nuri.business.security.util.SecurityUtil.hasPermission(operationPermission)) {
            return false;
        }
        if (nuri.business.security.util.SecurityUtil.hasPermission(overridePermission)) {
            return true;
        }
        String owner = entity.getFrstRgtrId();
        if (!org.springframework.util.StringUtils.hasText(owner)) {
            // 작성자 정보가 없으면 소유 판정이 불가능하다 — assertOwnerOrPermission 도 같은 입력에서
            // 거부하므로(현재 loginId 와 null 은 같을 수 없다) 화면에도 열어 주지 않는다.
            return false;
        }
        return nuri.business.security.util.SecurityUtil.getCurrentLoginId()
                .filter(owner::equals)
                .isPresent();
    }

    /** 매퍼는 요청 컨텍스트를 모르므로 수정·삭제의 독립적인 서버 판정을 덧붙인다. */
    private MemoReportDto toDtoWithPermission(MemoReport entity) {
        MemoReportDto dto = memoReportMapper.toDto(entity);
        dto.setEditable(canModify(entity, "MEMO_RPT_UPDATE", "MEMO_RPT_UPDATE_ALL"));
        dto.setDeletable(canModify(entity, "MEMO_RPT_DELETE", "MEMO_RPT_DELETE_ALL"));
        return dto;
    }

    public MemoReportDto getMemoReport(@NonNull Long memoRptSn) {
        MemoReport entity = memoReportRepository.findById(memoRptSn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        assertParticipantOrAdmin(entity); // [IDOR] 작성자·수신자·관리자만 열람
        return toDtoWithPermission(entity);
    }

    /**
     * 메모보고 열람 권한 검증. 작성자({@code userId}) 또는 수신자({@code rptrId}) 또는 관리자만 통과한다.
     *
     * <p>표준 가드 {@code SecurityUtil.assertOwnerOrAdmin} 은 loginId(=frstRgtrId) 축이라 여기서는 쓸 수 없다.
     * 메모보고의 참여자 필드는 {@code createMemoReport} 가 principal 의 {@code getUsername()} 을 저장하므로
     * <b>esntlId</b> 축이며, loginId 로 비교하면 수신자가 자기 앞으로 온 보고를 열지 못하는 오탐이 난다.</p>
     */
    private void assertParticipantOrAdmin(MemoReport entity) {
        if (nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_READ_ALL")) {
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
        Long atchFileSn = dto.getAtchFileSn();
        if (atchFileSn != null) {
            attachmentAssignmentPolicy.assertAssignable(atchFileSn);
        }
        MemoReport entity = MemoReport.builder()
                .rptTtl(dto.getRptTtl())
                .memoRptYmd(dto.getMemoRptYmd())
                .userId(userId)
                .rptrId(dto.getRptrId())
                .rptCn(dto.getRptCn())
                .atchFileSn(atchFileSn)
                .build();
        return memoReportRepository.save(entity).getMemoRptSn();
    }

    @Transactional
    public void updateMemoReport(Long memoRptSn, String userId, MemoReportDto dto) {
        MemoReport entity = memoReportRepository.findById(Objects.requireNonNull(memoRptSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrPermission(entity.getFrstRgtrId(), "MEMO_RPT_UPDATE_ALL"); // [IDOR] 작성자/관리자만 수정
        Long atchFileSn = dto.getAtchFileSn();
        if (atchFileSn != null && !Objects.equals(entity.getAtchFileSn(), atchFileSn)) {
            attachmentAssignmentPolicy.assertAssignable(atchFileSn);
        }
        entity.update(dto.getRptTtl(), dto.getMemoRptYmd(), entity.getUserId(), dto.getRptrId(),
                dto.getRptCn(), atchFileSn);
        entity.setLastMdfrId(userId);
    }

    @Transactional
    public void deleteMemoReport(@NonNull Long memoRptSn) {
        MemoReport entity = memoReportRepository.findById(memoRptSn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrPermission(entity.getFrstRgtrId(), "MEMO_RPT_DELETE_ALL"); // [IDOR] 작성자/관리자만 삭제
        memoReportRepository.delete(entity);
    }

    /**
     * 열람 표시. 열람일시는 <b>수신자가 처음 연 시각</b>이다(2026-09-25 DIP I7, D9).
     *
     * <p>종전에는 작성자·관리자가 열어도, 수신자가 다시 열어도 매번 덮어써서 목록의 '열람됨' 이 "수신자가
     * 읽었다" 를 뜻하지 않았다 — 작성자가 자기 보고를 다시 열기만 해도 열람됨이 됐다.</p>
     */
    @Transactional
    public void readMemoReport(@NonNull Long memoRptSn) {
        memoReportRepository.findById(memoRptSn).ifPresent(entity -> {
            assertParticipantOrAdmin(entity); // 열람 표시도 권한자만 — 미인가 요청이 조회일시를 갱신하지 못하게 한다
            boolean recipient = currentEsntlIdOrDeny().equals(entity.getRptrId());
            if (recipient && entity.getRptrInqDt() == null) {
                entity.updateInqireDt(java.time.LocalDateTime.now());
            }
        });
    }

    @Transactional
    public void updateDrctMatter(Long memoRptSn, String instrCn) {
        MemoReport entity = memoReportRepository.findById(memoRptSn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        assertRecipientOrAdmin(entity); // [IDOR] 지시는 보고를 받은 사람·관리자만 남긴다
        entity.updateDrctMatter(instrCn, java.time.LocalDateTime.now());
    }

    /**
     * 지시사항 작성 권한. 보고의 <b>수신자</b>({@code rptrId}, esntlId 축) 또는 전체 수정 권한자만 통과한다.
     *
     * <p>지시는 보고를 받은 사람이 작성자에게 내리는 것이다. 종전에는 열람 가드(작성자·수신자·관리자)를
     * 그대로 써서 <b>작성자가 수신자의 지시를 덮어쓸 수 있었다</b>(2026-09-25 DIP I7, D9).</p>
     */
    private void assertRecipientOrAdmin(MemoReport entity) {
        if (nuri.business.security.util.SecurityUtil.hasPermission("MEMO_RPT_UPDATE_ALL")) {
            return;
        }
        String esntlId = currentEsntlIdOrDeny();
        if (!esntlId.equals(entity.getRptrId())) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }
    }
}
