package com.company.project.service.isg;

import com.company.project.service.isg.dto.InternetSvcGuidanceDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface EgovInternetSvcGuidanceService {
    InternetSvcGuidanceDto getIntnetSvcGuidance(String intnetSvcId);

    void registerIntnetSvcGuidance(InternetSvcGuidanceDto dto);

    void updateIntnetSvcGuidance(InternetSvcGuidanceDto dto);

    void deleteIntnetSvcGuidance(String intnetSvcId);

    Page<InternetSvcGuidanceDto> getIntnetSvcGuidanceList(String searchKeyword, Pageable pageable);

    List<InternetSvcGuidanceDto> getIntnetSvcGuidanceResult();
}
