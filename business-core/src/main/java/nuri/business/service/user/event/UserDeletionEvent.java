package nuri.business.service.user.event;

import nuri.foundation.core.event.DomainEvent;

import java.util.List;

/**
 * 사용자 삭제 진행 이벤트 — 삭제 트랜잭션 <b>내부에서 동기 발행</b>된다.
 *
 * <p>[V2_12 FK 결속] tb_bbs_item·tb_bbs_comment·tb_adbk_manage·tb_user_noti 가
 * tb_user_info(esntl_id) 를 FK(NO ACTION)로 참조하므로, 사용자 행 삭제가 flush 되기 전에
 * 같은 트랜잭션 안에서 종속 데이터가 정리(콘텐츠 재귀속·알림 삭제)되어야 한다.
 * 따라서 구독자는 반드시 <b>동기 {@code @EventListener}</b> 여야 하며 {@code @Async} 를 금지한다
 * (비동기 전환 시 발행 트랜잭션 밖으로 이탈하여 FK 위반·정합 파손).
 *
 * <p>business-core → business-app 의 모듈 의존 방향상 코어가 앱 도메인(게시판/알림/주소록)
 * 리포지토리를 직접 참조할 수 없어, 이 이벤트를 확장 seam({@link DomainEvent})으로 사용한다.
 *
 * @param esntlIds 삭제 대상 사용자들의 esntl_id 목록 (tb_user_info PK)
 */
public record UserDeletionEvent(List<String> esntlIds) implements DomainEvent {
}
