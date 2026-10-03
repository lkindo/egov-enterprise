package nuri.business.service.informalsanction.dto;

import nuri.business.domain.informalsanction.ApprovalProcessType;

import java.time.LocalDateTime;

/**
 * 결재 처리 이력 한 줄(결재자 교체·보완 요청·보완 답변·본문 수정·재알림). 상세 화면에만 싣는다.
 *
 * @param content 보완 요청·답변의 내용, 본문 수정이면 고치기 전 본문. 교체·재알림은 null
 */
public record ApprovalProcessDto(ApprovalProcessType type, int atrzCycl, String actorNm, String targetNm,
                                 String beforeNm, String content, LocalDateTime at) {
}
