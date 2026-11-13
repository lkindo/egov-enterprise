package nuri.foundation.core.notification;

/**
 * 실시간 알림 전달 포트(Wave 4). 알림 원장(받은 알림함)은 DB 가 정본이고, 이 포트는 연결된 화면에 바로 보이게 하는 전달만 맡는다 —
 * 전달이 실패하거나 다른 노드에 연결된 사용자라도 화면은 60초 재조회로 같은 알림을 받는다.
 *
 * <p>기본 어댑터는 이 노드의 STOMP 단순 브로커로 보낸다. 외부 Pub/Sub 어댑터({@code nuri.notification.push.type=external})는 이
 * 노드에 보내고 같은 내용을 외부 발행 엔드포인트에도 낸다(멀티 노드·다른 소비자의 구독용). 받는 사람의 개인 목적지는 노출하지 않는다.
 */
public interface NotificationPushPort {

    /**
     * 한 사용자에게 보낸다.
     *
     * @param receiver    받는 사람(esntlId — STOMP 사용자 이름과 같은 축)
     * @param destination 사용자 목적지(예: {@code /queue/notifications})
     * @param payload     JSON 으로 직렬화할 내용
     */
    void pushToUser(String receiver, String destination, Object payload);
}
