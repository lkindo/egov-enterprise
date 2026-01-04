package com.company.project.service.duty;

import com.company.project.service.duty.dto.DutyCheckDto;
import com.company.project.service.duty.dto.DutyDto;

import java.util.List;

public interface EgovDutyService {
    DutyDto getDuty(String bndtId, String bndtDe);

    void registerDuty(DutyDto dto);

    void updateDuty(DutyDto dto);

    void deleteDuty(String bndtId, String bndtDe);

    List<DutyDto> getDutyList(String bndtDePrefix);

    List<DutyCheckDto> getDutyCheckList(String useAt);

    void saveDutyDiary(List<com.company.project.service.duty.dto.DutyDiaryDto> diaryList);
}
