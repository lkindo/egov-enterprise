package nuri.business.service.informalsanction.dto;

import nuri.business.domain.informalsanction.ApprovalStageKind;
import nuri.business.domain.informalsanction.ApprovalStatus;

import java.util.List;

public record ApprovalStageDto(int order, ApprovalStageKind kind, ApprovalStatus status,
                               List<ApprovalApproverDto> approvers) {
}
