package nuri.business.service.file;

import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.file.FileMaster;
import nuri.business.security.util.SecurityUtil;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.stereotype.Component;

/**
 * 🔒 첨부파일 <b>도달성 기반 인가</b> 정책.
 *
 * <p>[고친 결함] 종전 {@code FileApiController} 는 클래스레벨 {@code @PreAuthorize("isAuthenticated()")}
 * 뿐이었다. 즉 <b>로그인만 하면 임의의 {@code atchFileSn} 로 남의 첨부를 목록 조회·다운로드</b>할 수 있었다
 * (수평 IDOR). {@code atch_file_sn} 는 게시글 목록 응답 등으로 자연히 노출되므로 열거가 필요하지도 않았다.
 *
 * <p>[판정 표] 위에서부터 먼저 성립하는 것이 결론이다.
 * <ol>
 *   <li><b>업로더 본인</b>({@code tb_file_master.frst_rgtr_id} = loginId) → <b>어느 업무 행에도 붙지 않았을 때만</b> 허용.
 *       업로드 직후의 <b>미첨부 창(window)</b>을 여는 유일한 근거다. 이게 없으면 "파일 올리고 → 미리보기 → 글 저장" 흐름이 자기
 *       파일에 대해 403 이 된다. 업무 행에 붙은 뒤에는 그 참조의 판정을 따른다 — 업로더라는 이유로 사용 안 함 게시판의 잠금
 *       (ADR-0040 결정 1)을 지나면 안 된다.</li>
 *   <li><b>참조원 조회 실패</b> — 하나라도 판정할 수 없으면 다른 소유·공유 근거와 무관하게 불허.</li>
 *   <li><b>개인 소유 근거</b> — 개인 귀속(PERSONAL) 참조가 있으면 그 참조의 소유자·당사자만 허용.
 *       같은 파일을 가리키는 공유 참조의 소유자는 개인 첨부를 열 수 없다. 열람 전용 당사자(메모보고 수신자)도 열람은
 *       하지만 삭제 근거는 아니다({@link #assertDeletable}).</li>
 *   <li><b>비개인 참조원의 본문 제한</b> — 일정의 작성자·전체 열람 권한자·같은 부서 공유 독자가 아니면
 *       다른 공유 참조와 FILE_READ_ALL로 첨부만 열 수 없다. 개인 참조 당사자 판정·삭제 권한은 그대로다.</li>
 *   <li><b>비개인 소유·공유 근거</b> — 개인 참조가 없을 때 참조 행 소유자 또는 공유 콘텐츠 독자 허용.</li>
 *   <li><b>관리자</b>(ADMIN/SYSTEM) → 허용. <b>단 개인 귀속(PERSONAL) 참조원이 하나라도 있으면 불허</b> —
 *       쪽지·상벌·업무보고 첨부를 관리자가 열람하는 것은 표준화가 아니라 프라이버시 회귀다(AGENTS.md Evidence guardrails H3).</li>
 *   <li>그 외 → <b>403</b>. 참조원을 모르는 첨부는 열지 않는다(fail-closed).</li>
 * </ol>
 *
 * <p>[의도적으로 보수적인 지점] 개인 귀속 도메인의 소유 축은 전 컬럼 실측이 끝난
 * {@code frst_rgtr_id}(loginId) 와 쪽지의 발신/수신(esntlId)만 채택했다. {@code user_id}·
 * {@code rwrd_user_id} 등 축이 미확정인 컬럼은 <b>근거로 쓰지 않는다</b> — 축을 잘못 고르면 뚫리거나
 * 잠기는데, 잠김은 눈에 보이고 뚫림은 보이지 않는다. 잔여는 운영 문서에 이월한다.
 * [2026-10-19] 메모보고 수신자 {@code rptr_id} 는 축이 정해졌다 — 등록 경로가 활성 사용자의 esntlId 로만 받고
 * ({@code MemoReportService.createMemoReport}), 메모 열람 판정도 같은 축으로 비교한다. 그래서 열람 전용 당사자로 채택했다.
 */
@Slf4j
@Component
public class FileAccessPolicy {

    private final AttachmentReferenceResolver referenceResolver;

    public FileAccessPolicy(AttachmentReferenceResolver referenceResolver) {
        this.referenceResolver = referenceResolver;
    }

    /**
     * 현재 인증 주체가 이 첨부를 열람할 수 있는지 검증한다.
     *
     * @param master 대상 첨부 마스터(존재 검증은 호출부에서 이미 수행)
     * @throws BusinessException ACCESS_DENIED(403) — 도달 근거가 없을 때
     */
    public void assertReadable(FileMaster master) {
        Long atchFileSn = master.getAtchFileSn();
        String loginId = SecurityUtil.getCurrentLoginId().orElse(null);
        String esntlId = SecurityUtil.getCurrentEsntlId().orElse(null);

        if (loginId == null && esntlId == null) {
            // 미인증. 필터 체인이 먼저 막지만, 서비스 레이어 이중 검증(백엔드 헌법 제8조)에서도 닫는다.
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }

        // 1. 업로더 본인 — 미첨부 창.
        if (isUnattachedUpload(master, loginId)) {
            return;
        }

        AttachmentReferenceResolver.Grants grants = referenceResolver.resolve(atchFileSn, loginId, esntlId);

        // 2. 참조원 하나라도 판정하지 못했다면 앞뒤에서 확인한 모든 근거보다 실패가 우선한다.
        if (grants.resolutionFailed()) {
            log.warn("[FileAccess] 첨부 열람 거부 — 참조원 조회 실패 atchFileSn={}", atchFileSn);
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }

        // 3·4. 개인 참조가 있으면 그 개인 참조의 당사자만 허용한다.
        // 공유 참조의 소유 근거(ownerGrant)가 섞여도 개인 파일을 공개하는 근거가 될 수 없다.
        // 열람 전용 당사자(메모보고 수신자)도 여기서 연다 — 삭제 판정(assertDeletable)은 이 근거를 보지 않는다.
        if (grants.personalReference()) {
            if (grants.personalOwnerGrant() || grants.personalReaderGrant()) {
                return;
            }
        } else if (grants.readDenied()) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        } else if (grants.ownerGrant() || (grants.sharedGrant() && !grants.personalReference())) {
            return;
        }

        // 5. 관리자 — 개인 귀속 참조원이 없을 때만.
        boolean admin = SecurityUtil.hasPermission("FILE_READ_ALL");
        if (admin && !grants.personalReference()) {
            return;
        }

        log.warn("[FileAccess] 첨부 열람 거부 — atchFileSn={} loginId={} admin={} personalRef={}",
                atchFileSn, loginId, admin, grants.personalReference());
        throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
    }

    /**
     * 어느 업무 참조원이든 이 첨부를 가리키는가(첨부 묶음을 통째로 지울지 판정할 때, ADR-0042). 조회에 실패하면 참조가 있는 것으로
     * 본다 — 지우지 않는다. PostgreSQL 에서는 그 실패가 호출자 트랜잭션을 중단시키므로 호출한 작업 전체가 되돌아간다.
     */
    public boolean referenced(Long atchFileSn) {
        return referenceResolver.referenced(atchFileSn);
    }

    /**
     * 현재 인증 주체가 이 첨부를 <b>삭제</b>할 수 있는지 검증한다.
     *
     * <p>[열람과 다른 점] <b>공유 근거는 삭제 근거가 아니다.</b> 비밀글이 아닌 게시글의 첨부는 인증
     * 사용자 누구나 읽지만, 그 사실이 남의 첨부를 지울 권리를 주지는 않는다. 판정 표:
     * <ol>
     *   <li><b>업로더 본인</b>({@code frst_rgtr_id} = loginId) → 어느 업무 행에도 붙지 않았을 때만 허용. 잘못 올린 파일을 글 저장
     *       전에 되돌리는 경로다.</li>
     *   <li><b>참조원 조회 실패</b> — 하나라도 판정할 수 없으면 다른 근거와 무관하게 불허.</li>
     *   <li><b>개인 귀속 참조</b> — 당사자도 관리자도 이 경로로 지우지 못한다(ADR-0048). 같은 묶음을 여러 당사자가 보므로 쪽지
     *       수신자 한 명이 지우면 모두의 파일이 사라지고, 지시가 달린 메모는 작성자가 첨부를 빼도 지시가 남는다.</li>
     *   <li><b>비개인 소유 근거</b> — 참조 행의 소유자만 허용.</li>
     *   <li><b>관리자</b>(ADMIN/SYSTEM) → 허용.</li>
     *   <li>그 외 → <b>403</b>. 참조원을 모르는 첨부는 지우지 않는다(fail-closed).</li>
     * </ol>
     *
     * @param master 대상 첨부 마스터(존재 검증은 호출부에서 이미 수행)
     * @throws BusinessException ACCESS_DENIED(403) — 삭제 근거가 없을 때
     */
    public void assertDeletable(FileMaster master) {
        Long atchFileSn = master.getAtchFileSn();
        String loginId = SecurityUtil.getCurrentLoginId().orElse(null);
        String esntlId = SecurityUtil.getCurrentEsntlId().orElse(null);

        if (loginId == null && esntlId == null) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }

        // 1. 업로더 본인 — 미첨부 창.
        if (isUnattachedUpload(master, loginId)) {
            return;
        }

        AttachmentReferenceResolver.Grants grants = referenceResolver.resolve(atchFileSn, loginId, esntlId);

        // 2. 참조원 하나라도 판정하지 못했다면 확인된 소유·관리자 근거보다 실패가 우선한다.
        if (grants.resolutionFailed()) {
            log.warn("[FileAccess] 첨부 삭제 거부 — 참조원 조회 실패 atchFileSn={}", atchFileSn);
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }

        // 3. 개인 귀속 첨부는 이 경로로 지우지 않는다. 묶음을 바꾸는 일은 각 업무의 수정 경로가 맡는다(ADR-0048).
        if (grants.personalReference()) {
            log.warn("[FileAccess] 첨부 삭제 거부 — 개인 귀속 참조 atchFileSn={} loginId={}", atchFileSn, loginId);
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }

        // 4. 공유 근거는 삭제 근거가 아니다 — 참조 행의 소유자만 허용한다.
        if (grants.ownerGrant()) {
            return;
        }

        // 5. 관리자.
        boolean admin = SecurityUtil.hasPermission("FILE_DELETE_ALL");
        if (admin) {
            return;
        }

        log.warn("[FileAccess] 첨부 삭제 거부 — atchFileSn={} loginId={} admin={} ownerGrant={}",
                atchFileSn, loginId, admin, grants.ownerGrant());
        throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
    }

    /** 내가 올렸고 아직 어느 업무 행도 가리키지 않는 첨부인가. 참조 조회에 실패하면 참조가 있는 것으로 본다(fail-closed). */
    private boolean isUnattachedUpload(FileMaster master, String loginId) {
        return loginId != null && loginId.equals(master.getFrstRgtrId())
                && !referenceResolver.referenced(master.getAtchFileSn());
    }

    /**
     * 현재 인증 주체가 이 첨부를 다른 업무 자원에 연결할 수 있는지 검증한다.
     *
     * <p>열람 가능성과 재게시 가능성은 다르다. 공유 게시물의 첨부나 기존 참조의 당사자는 파일을 읽을 수
     * 있지만, 그 사실만으로 동일 파일을 새 공유 자원에 연결하도록 허용하면 개인 귀속 첨부의 접근 범위를
     * 넓힐 수 있다. 따라서 새 참조 생성은 원 업로더에게만 허용하며 소유·공유 참조와 관리자 역할은 연결
     * 근거로 사용하지 않는다.
     *
     * @param master 대상 첨부 마스터(존재 검증은 호출부에서 이미 수행)
     * @throws BusinessException ACCESS_DENIED(403) — 연결 권한이 없을 때
     */
    public void assertAttachable(FileMaster master) {
        Long atchFileSn = master.getAtchFileSn();
        String loginId = SecurityUtil.getCurrentLoginId().orElse(null);

        if (loginId != null && loginId.equals(master.getFrstRgtrId())) {
            return;
        }

        log.warn("[FileAccess] 첨부 연결 거부 — atchFileSn={}", atchFileSn);
        throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
    }
}
