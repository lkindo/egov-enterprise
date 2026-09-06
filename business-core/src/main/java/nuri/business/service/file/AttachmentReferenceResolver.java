package nuri.business.service.file;

/**
 * 첨부({@code atchFileSn})를 참조하는 업무 행을 조회해 <b>열람 근거</b>로 환원하는 포트.
 *
 * <p>판정(정책)과 조회(SQL)를 분리한 이유는 하나다 — 정책의 결정 표를 DB 없이 검증할 수 있어야
 * 하기 때문이다. DB 를 띄워야만 검증되는 인가 로직은 사실상 검증되지 않는다.
 *
 * @see FileAccessPolicy
 * @see JdbcAttachmentReferenceResolver
 */
public interface AttachmentReferenceResolver {

    /**
     * @param atchFileSn 첨부파일 일련번호
     * @param loginId    현재 사용자 loginId ({@code frst_rgtr_id} 축)
     * @param esntlId    현재 사용자 esntlId ({@code user_id}·{@code sndr_id}·{@code rcvr_id} 축)
     */
    Grants resolve(Long atchFileSn, String loginId, String esntlId);

    /**
     * 참조원 조회 결과를 열람 근거와 실패 상태로 압축한 값.
     *
     * @param sharedGrant        공유 콘텐츠(비밀글 아님 등)로서 인증 사용자에게 열람 근거가 있는가
     * @param ownerGrant         현재 사용자가 민감도와 무관하게 참조 행의 소유자·당사자인가
     * @param personalReference  개인 귀속(PERSONAL) 참조원이 하나라도 있는가 — <b>관리자 우회를 차단</b>한다
     * @param personalOwnerGrant 현재 사용자가 개인 귀속 참조 행의 소유자·당사자인가
     * @param resolutionFailed   참조원 하나라도 조회에 실패했는가 — 다른 근거보다 우선해 <b>전부 거부</b>한다
     */
    record Grants(
            boolean sharedGrant,
            boolean ownerGrant,
            boolean personalReference,
            boolean personalOwnerGrant,
            boolean resolutionFailed) {

        public static Grants none() {
            return new Grants(false, false, false, false, false);
        }
    }
}
