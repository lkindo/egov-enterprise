package nuri.business.service.informalsanction;

import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface InformalSanctionService {
    Page<InformalSanctionDto> getInformalSanctionList(String aplcntId, Pageable pageable);

    Page<InformalSanctionDto> getReceivedInformalSanctionList(String aprvrId, Pageable pageable);

    InformalSanctionDto getInformalSanction(String ifmlAtrzId);

    void registerInformalSanction(InformalSanctionDto dto);

    void updateInformalSanction(InformalSanctionDto dto);

    void deleteInformalSanction(String ifmlAtrzId);

    // 승인/반려 처리
    void confirmInformalSanction(String ifmlAtrzId, String aprvYn, String rjctRsnCn);
}
