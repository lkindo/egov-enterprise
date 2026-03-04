package com.company.project.service.vacation;

import com.company.project.service.vacation.dto.UserAbsenceDto;
import com.company.project.service.vacation.dto.VacationDto;
import com.company.project.service.vacation.dto.YearlyLeaveDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface VacationService {

    // --- Vacation Management ---
    Page<VacationDto> getVacationList(String userId, String searchWrd, Pageable pageable);

    VacationDto getVacation(String applcntId, String vcatnSe, String bgnde);

    void requestVacation(String userId, VacationDto dto);

    void updateVacation(String userId, VacationDto dto);

    void deleteVacation(String applcntId, String vcatnSe, String bgnde);

    void confirmVacation(String userId, String applcntId, String vcatnSe, String bgnde, String confmAt,
            String returnResn);

    // --- Yearly Leave Management ---
    List<YearlyLeaveDto> getYearlyLeaveList(String occrrncYear, String searchWrd);

    YearlyLeaveDto getYearlyLeave(String occrrncYear, String userId);

    void saveYearlyLeave(String userId, YearlyLeaveDto dto);

    // --- User Absence Management ---
    Page<UserAbsenceDto> getUserAbsenceList(String searchWrd, Pageable pageable);

    UserAbsenceDto getUserAbsence(String userId);

    void saveUserAbsence(String userId, UserAbsenceDto dto);

    void deleteUserAbsence(String userId);
}