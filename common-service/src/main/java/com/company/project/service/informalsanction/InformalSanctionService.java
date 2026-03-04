package com.company.project.service.informalsanction;

import com.company.project.service.informalsanction.dto.InformalSanctionDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface InformalSanctionService {
    Page<InformalSanctionDto> getInformalSanctionList(String applicantId, Pageable pageable);

    Page<InformalSanctionDto> getReceivedInformalSanctionList(String sanctionerId, Pageable pageable);

    InformalSanctionDto getInformalSanction(String informalSanctionId);

    void registerInformalSanction(InformalSanctionDto dto);

    void updateInformalSanction(InformalSanctionDto dto);

    void deleteInformalSanction(String informalSanctionId);

    // 승인/반려 처리
    void confirmInformalSanction(String informalSanctionId, String confmAt, String returnResn);
}
