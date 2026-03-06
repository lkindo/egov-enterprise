package com.company.project.service.anniversary;

import com.company.project.service.anniversary.dto.AnniversaryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovAnniversaryService {
    Page<AnniversaryDto> getAnniversaryList(String keyword, Pageable pageable);

    Page<AnniversaryDto> getMyAnniversaryList(String userId, Pageable pageable);

    AnniversaryDto getAnniversary(String annId);

    void insertAnniversary(String userId, AnniversaryDto dto);

    void updateAnniversary(String annId, String userId, AnniversaryDto dto);

    void deleteAnniversary(String annId);

    int checkAnniversaryDuplicate(String userId, String annvrsryDe, String annvrsryNm, String annId);
}
