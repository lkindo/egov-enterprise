package com.company.project.service.anniversary;

import com.company.project.service.anniversary.dto.AnniversaryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * 기념일관리 서비스 인터페이스
 */
public interface EgovAnniversaryService {
    Page<AnniversaryDto> getAnniversaryList(String keyword, Pageable pageable);

    List<AnniversaryDto> getUserAnniversaries(String userId);

    AnniversaryDto getAnniversary(String annId);

    String createAnniversary(String userId, AnniversaryDto dto);

    void updateAnniversary(String annId, String userId, AnniversaryDto dto);

    void deleteAnniversary(String annId);

    int checkAnniversaryDuplicate(String usid, String annvrsryDe, String annvrsryNm);
}
