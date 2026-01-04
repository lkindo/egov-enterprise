package com.company.project.service.vacation;

import com.company.project.service.vacation.dto.VacationDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface EgovVacationService {
    VacationDto getVacation(String applcntId, String vcatnSe, String bgnde);

    void registerVacation(VacationDto vacationDto);

    void updateVacation(VacationDto vacationDto);

    void deleteVacation(String applcntId, String vcatnSe, String bgnde);

    void approveVacation(String applcntId, String vcatnSe, String bgnde, String sanctnerId, String confmAt,
            String returnResn, String lastUpdusrId);

    // Additional Methods
    Page<VacationDto> getVacationList(String applcntId, Pageable pageable);

    Page<VacationDto> getVacationListConfm(String sanctnerId, String confmAt, Pageable pageable); // ConfmAt can be null
                                                                                                  // for all

    int checkVacationDuplicate(String applcntId, String bgnde, String endde);
}
