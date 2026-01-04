package com.company.project.service.vacation;

import com.company.project.service.vacation.dto.AnnualLeaveDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovAnnualLeaveService {
        AnnualLeaveDto getAnnualLeave(String userId, String occrrncYear);

        void registerAnnualLeave(AnnualLeaveDto dto);

        void updateAnnualLeaveUsage(String userId, String occrrncYear, double useYrycCo, double remndrYrycCo,
                        String lastUpdusrId);

        // Update List method to support pagination and search
        Page<AnnualLeaveDto> getAnnualLeaveList(String occrrncYear, String userId, Pageable pageable);
}
