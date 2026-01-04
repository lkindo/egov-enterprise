package com.company.project.service.sanctn;

import com.company.project.service.sanctn.dto.InformalSanctnDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovInformalSanctnService {
    InformalSanctnDto getInfrmlSanctn(String infrmlSanctnId);

    void registerInfrmlSanctn(InformalSanctnDto dto);

    void updateInfrmlSanctn(InformalSanctnDto dto);

    void deleteInfrmlSanctn(String infrmlSanctnId);

    // 승인 및 반려 처리
    void confirmInfrmlSanctn(InformalSanctnDto dto);
}
