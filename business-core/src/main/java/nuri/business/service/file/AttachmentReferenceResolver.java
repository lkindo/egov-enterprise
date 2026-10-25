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
     * 어느 업무 참조원이든 이 첨부를 가리키는가(파생 로그 제외). 첨부 묶음을 통째로 지울지 판정할 때 쓴다 — 조회에 실패한 참조원이
     * 하나라도 있으면 참조가 있는 것으로 본다(fail-closed, 지우지 않는다). 기본 구현은 늘 참조가 있다고 답한다.
     */
    default boolean referenced(Long atchFileSn) {
        return true;
    }

    /**
     * 참조원 조회 결과를 열람 근거와 실패 상태로 압축한 값.
     *
     * @param sharedGrant        공유 콘텐츠(비밀글 아님 등)로서 인증 사용자에게 열람 근거가 있는가
     * @param ownerGrant         현재 사용자가 민감도와 무관하게 참조 행의 소유자·당사자인가
     * @param personalReference  개인 귀속(PERSONAL) 참조원이 하나라도 있는가 — <b>관리자 우회를 차단</b>한다
     * @param personalOwnerGrant 현재 사용자가 개인 귀속 참조 행의 소유자·당사자인가
     * @param resolutionFailed   참조원 하나라도 조회에 실패했는가 — 다른 근거보다 우선해 <b>전부 거부</b>한다
     * @param personalReaderGrant 현재 사용자가 개인 귀속 참조 행을 <b>열람만</b> 할 수 있는 당사자인가(메모보고 수신자 등).
     *                            열람 근거일 뿐 삭제 근거가 아니다
     * @param readDenied 비개인 참조원의 본문 열람 조건을 만족하지 못했는가 — 일반 공유·FILE_READ_ALL로 우회할 수 없다.
     *                   PERSONAL 당사자 판정과 삭제·재연결 권한에는 영향을 주지 않는다
     */
    record Grants(
            boolean sharedGrant,
            boolean ownerGrant,
            boolean personalReference,
            boolean personalOwnerGrant,
            boolean resolutionFailed,
            boolean personalReaderGrant,
            boolean readDenied) {

        public Grants(boolean sharedGrant, boolean ownerGrant, boolean personalReference,
                boolean personalOwnerGrant, boolean resolutionFailed, boolean personalReaderGrant) {
            this(sharedGrant, ownerGrant, personalReference, personalOwnerGrant, resolutionFailed,
                    personalReaderGrant, false);
        }

        /** 열람 전용 당사자 근거가 없는 판정. 기존 다섯 근거만 쓰는 판정 표가 그대로 읽힌다. */
        public Grants(boolean sharedGrant, boolean ownerGrant, boolean personalReference,
                boolean personalOwnerGrant, boolean resolutionFailed) {
            this(sharedGrant, ownerGrant, personalReference, personalOwnerGrant, resolutionFailed, false);
        }

        public static Grants none() {
            return new Grants(false, false, false, false, false, false);
        }
    }
}
