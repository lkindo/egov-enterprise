package nuri.business.service.informalsanction.dto;

import nuri.business.domain.informalsanction.ApprovalStatus;

import java.time.LocalDateTime;

public record ApprovalApproverDto(String userId, String userNm, ApprovalStatus status,
                                  String opinion, LocalDateTime decidedAt) {
}
