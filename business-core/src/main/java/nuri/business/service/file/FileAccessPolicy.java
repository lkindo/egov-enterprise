package nuri.business.service.file;

import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.file.FileMaster;
import nuri.business.security.util.SecurityUtil;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.security.AuthorityConstants;
import org.springframework.stereotype.Component;

/**
 * 🔒 첨부파일 <b>도달성 기반 인가</b> 정책.
 *
 * <p>[고친 결함] 종전 {@code FileApiController} 는 클래스레벨 {@code @PreAuthorize("isAuthenticated()")}
 * 뿐이었다. 즉 <b>로그인만 하면 임의의 {@code atchFileId} 로 남의 첨부를 목록 조회·다운로드</b>할 수 있었다
 * (수평 IDOR). {@code atch_file_id} 는 게시글 목록 응답 등으로 자연히 노출되므로 열거가 필요하지도 않았다.
 *
 * <p>[판정 표] 위에서부터 먼저 성립하는 것이 결론이다.
 * <ol>
 *   <li><b>업로더 본인</b>({@code tb_file_master.frst_rgtr_id} = loginId) → 허용.
 *       업로드 직후 아직 어떤 업무 행에도 붙지 않은 <b>미첨부 창(window)</b>을 여는 유일한 근거다.
 *       이게 없으면 "파일 올리고 → 미리보기 → 글 저장" 흐름이 자기 파일에 대해 403 이 된다.</li>
 *   <li><b>소유 근거</b> — 참조 행의 소유자·당사자(작성자, 쪽지 발신/수신자 등) → 허용.</li>
 *   <li><b>공유 근거</b> — 비밀글이 아닌 게시글·배너·일정 등 인증 사용자에게 열린 콘텐츠 → 허용.</li>
 *   <li><b>관리자</b>(ADMIN/SYSTEM) → 허용. <b>단 개인 귀속(PERSONAL) 참조원이 하나라도 있으면 불허</b> —
 *       쪽지·상벌·업무보고 첨부를 관리자가 열람하는 것은 표준화가 아니라 프라이버시 회귀다(§0.7-H3).</li>
 *   <li>그 외 → <b>403</b>. 참조원을 모르는 첨부는 열지 않는다(fail-closed).</li>
 * </ol>
 *
 * <p>[의도적으로 보수적인 지점] 개인 귀속 도메인의 소유 축은 전 컬럼 실측이 끝난
 * {@code frst_rgtr_id}(loginId) 와 쪽지의 발신/수신(esntlId)만 채택했다. {@code user_id}·{@code rptr_id}·
 * {@code rwrd_user_id} 등 축이 미확정인 컬럼은 <b>근거로 쓰지 않는다</b> — 축을 잘못 고르면 뚫리거나
 * 잠기는데, 잠김은 눈에 보이고 뚫림은 보이지 않는다. 잔여는 운영 문서에 이월한다.
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
        String atchFileId = master.getAtchFileId();
        String loginId = SecurityUtil.getCurrentLoginId().orElse(null);
        String esntlId = SecurityUtil.getCurrentEsntlId().orElse(null);

        if (loginId == null && esntlId == null) {
            // 미인증. 필터 체인이 먼저 막지만, 서비스 레이어 이중 검증(백엔드 헌법 제8조)에서도 닫는다.
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }

        // 1. 업로더 본인 — 미첨부 창.
        if (loginId != null && loginId.equals(master.getFrstRgtrId())) {
            return;
        }

        AttachmentReferenceResolver.Grants grants = referenceResolver.resolve(atchFileId, loginId, esntlId);

        // 2·3. 소유 근거 또는 공유 근거.
        if (grants.ownerGrant() || grants.sharedGrant()) {
            return;
        }

        // 4. 관리자 — 개인 귀속 참조원이 없을 때만.
        boolean admin = SecurityUtil.hasRole(AuthorityConstants.ROLE_ADMIN)
                || SecurityUtil.hasRole(AuthorityConstants.ROLE_SYSTEM);
        if (admin && !grants.personalReference()) {
            return;
        }

        log.warn("[FileAccess] 첨부 열람 거부 — atchFileId={} loginId={} admin={} personalRef={}",
                atchFileId, loginId, admin, grants.personalReference());
        throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
    }
}
