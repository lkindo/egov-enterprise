package com.company.project.service.vacation;

import com.company.project.service.vacation.dto.UserAbsenceDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovUserAbsenceService {
    UserAbsenceDto getUserAbsence(String userId);

    void updateUserAbsence(String userId, String userAbsnceAt, String lastUpdusrId);

    void registerUserAbsence(UserAbsenceDto dto);

    Page<UserAbsenceDto> getUserAbsenceList(String searchKeyword, String selAbsnceAt, Pageable pageable);
}
