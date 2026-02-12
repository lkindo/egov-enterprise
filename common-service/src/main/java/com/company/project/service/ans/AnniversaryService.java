package com.company.project.service.ans;

import com.company.project.service.ans.dto.AnniversaryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface AnniversaryService {
    Page<AnniversaryDto> getAnniversaryList(String keyword, Pageable pageable);
    
    List<AnniversaryDto> getUserAnniversaries(String userId);
    
    AnniversaryDto getAnniversary(String annId);
    
    String createAnniversary(String userId, AnniversaryDto dto);
    
    void updateAnniversary(String annId, String userId, AnniversaryDto dto);
    
    void deleteAnniversary(String annId);
}
