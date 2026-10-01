package nuri.business.service.log.dto;

import java.time.LocalDateTime;

/**
 * 민감 작업 감사 원장 한 행(2026-10-01 결정 19). 어느 요청의 어느 단계인지, 누가 무엇을 대상으로 했는지만 싣는다.
 * 행위자 로그인 ID·접속 IP 를 담으므로 개인정보 접근 응답으로 분류한다.
 */
public record AuditJournalEntry(String id, String requestId, String stage, String operation, String actorId,
                                LocalDateTime occurredAt, String targetId, String clientIp, String description,
                                Integer httpStatus) {
}
