package nuri.foundation.core.event;

/**
 * 어떤 업무 사건이 특정 사용자에게 알릴 만한 일이 되었다.
 *
 * <p><b>왜 foundation 에 두는가</b> — 여러 도메인(결재·쪽지·게시판…)이 발행하고 notification
 * 도메인이 소비한다. 이벤트를 발행자나 소비자 어느 한쪽 패키지에 두면 반대편이 그 패키지를
 * import 하게 되어, 주입은 사라져도 <b>컴파일 의존은 그대로 남는다</b>. 그러면 교차 결합
 * census 의 숫자만 내려가고 실제로는 어느 도메인도 떼어 낼 수 없다(AGENTS H2 — 신호 은폐).
 * {@link PostCommentCountChangedEvent} 가 comment↔board 를 떼어 놓은 것과 같은 자리다.
 *
 * <p><b>왜 필요했나</b> — {@code NotificationService.createNotification} 의 notification 패키지 밖
 * 호출자가 <b>0건</b>이었다. 즉 알림은 관리자가 손으로 만드는 공지뿐이었고, 결재가 승인되거나
 * 쪽지가 도착해도 시스템이 알림을 만들지 않았다. 미읽음 카운트·WebSocket 전달·화면은 모두
 * 완성돼 있었는데 <b>알릴 사건이 아무것도 들어오지 않는</b> 상태였다.
 *
 * <p><b>발행 시점 규약</b> — 반드시 <b>커밋 이후</b>에 발행한다
 * ({@code TransactionUtils.runAfterCommit}). 커밋 전에 발행하면 롤백된 업무에 대한 알림이
 * 남아 사용자가 존재하지 않는 결재·쪽지를 보러 간다.
 *
 * @param receiverEsntlId 수신자 고유 ID(esntlId). {@code tb_user_noti.rcvr_id} 축과 같다 —
 *                        loginId 를 넣으면 알림이 아무에게도 보이지 않는다
 * @param title           알림 제목({@code noti_ttl_nm}, 100자)
 * @param content         알림 본문({@code noti_cn}, 4000자)
 * @param linkUrl         눌렀을 때 이동할 내부 경로. 없으면 {@code null}
 */
public record NotificationRequestedEvent(
        String receiverEsntlId,
        String title,
        String content,
        String linkUrl
) implements DomainEvent {

    /** 수신자가 없으면 알림을 만들 수 없다 — 발행 측에서 걸러야 하지만 소비 측도 방어한다. */
    public boolean hasReceiver() {
        return receiverEsntlId != null && !receiverEsntlId.isBlank();
    }
}
