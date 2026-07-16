package nuri.foundation.core.event;

/**
 * 프레임워크 도메인 이벤트 마커 인터페이스.
 *
 * <p>Spring {@code ApplicationEventPublisher}로 발행하고 {@code @EventListener}(+{@code @Async})로 구독한다.
 * 코어 서비스 본문을 수정하지 않고 <b>감사·검색색인·알림</b> 등 횡단 관심사를 리스너로 주입하는 확장 seam 이다.
 * 파생 프로젝트는 이 인터페이스를 구현한 이벤트를 발행/구독하여 코어 무수정으로 기능을 덧붙일 수 있다.
 */
public interface DomainEvent {
}
