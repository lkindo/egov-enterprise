package com.company.project.service.sanctn;

import com.company.project.domain.sanctn.InformalSanctn;
import com.company.project.domain.sanctn.InformalSanctnRepository;
import com.company.project.service.sanctn.dto.ApprovalDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApprovalService {

    private final InformalSanctnRepository informalSanctnRepository;

    public Page<ApprovalDto> getPendingApprovals(String approverId, Pageable pageable) {
        return informalSanctnRepository.findBySanctnerIdAndConfmAt(approverId, "R", pageable)
                .map(ApprovalDto::from);
    }

    public Page<ApprovalDto> getMyApprovalHistory(String userId, Pageable pageable) {
        return informalSanctnRepository.findByApplcntId(userId, pageable)
                .map(ApprovalDto::from);
    }

    @Transactional
    public void confirmApproval(String approvalId, String status, String reason) {
        InformalSanctn entity = informalSanctnRepository.findById(approvalId)
                .orElseThrow(() -> new RuntimeException("Approval request not found"));
        
        entity.confirm(status, reason);
    }
}
