package com.company.project.service.schedule;

import com.company.project.domain.schedule.LeaderSchedule;
import com.company.project.domain.schedule.LeaderScheduleRepository;
import com.company.project.service.schedule.dto.LeaderScheduleDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeaderScheduleService implements EgovLeaderScheduleService {

    private final LeaderScheduleRepository leaderScheduleRepository;

    @Override
    @Transactional
    public void registerLeaderSchedule(LeaderScheduleDto dto) {
        LeaderSchedule schedule = LeaderSchedule.builder()
                .scheduleId(dto.getScheduleId())
                .scheduleNm(dto.getScheduleNm())
                .scheduleCn(dto.getScheduleCn())
                .leaderId(dto.getLeaderId())
                .chargerId(dto.getChargerId())
                .beginDate(dto.getBeginDate())
                .endDate(dto.getEndDate())
                .repeatYn(dto.getRepeatYn())
                .importanceCode(dto.getImportanceCode())
                .scheduleType(dto.getScheduleType())
                .frstRegisterId(dto.getLeaderId())
                .lastUpdusrId(dto.getLeaderId())
                .build();
        leaderScheduleRepository.save(schedule);
    }

    @Override
    @Transactional
    public void updateLeaderSchedule(LeaderScheduleDto dto) {
        leaderScheduleRepository.findById(dto.getScheduleId())
                .ifPresent(s -> s.update(
                        dto.getScheduleNm(),
                        dto.getScheduleCn(),
                        dto.getChargerId(),
                        dto.getBeginDate(),
                        dto.getEndDate(),
                        dto.getRepeatYn(),
                        dto.getImportanceCode(),
                        dto.getScheduleType(),
                        dto.getLeaderId()));
    }

    @Override
    @Transactional
    public void deleteLeaderSchedule(String scheduleId) {
        leaderScheduleRepository.deleteById(scheduleId);
    }

    @Override
    public LeaderScheduleDto getLeaderSchedule(String scheduleId) {
        return leaderScheduleRepository.findById(scheduleId)
                .map(s -> LeaderScheduleDto.builder()
                        .scheduleId(s.getScheduleId())
                        .scheduleNm(s.getScheduleNm())
                        .scheduleCn(s.getScheduleCn())
                        .leaderId(s.getLeaderId())
                        .chargerId(s.getChargerId())
                        .beginDate(s.getBeginDate())
                        .endDate(s.getEndDate())
                        .repeatYn(s.getRepeatYn())
                        .importanceCode(s.getImportanceCode())
                        .scheduleType(s.getScheduleType())
                        .build())
                .orElse(null);
    }

    @Override
    public Page<LeaderScheduleDto> getLeaderScheduleList(String searchKeyword, Pageable pageable) {
        return leaderScheduleRepository.findAll(pageable)
                .map(s -> LeaderScheduleDto.builder()
                        .scheduleId(s.getScheduleId())
                        .scheduleNm(s.getScheduleNm())
                        .leaderId(s.getLeaderId())
                        .beginDate(s.getBeginDate())
                        .endDate(s.getEndDate())
                        .importanceCode(s.getImportanceCode())
                        .build());
    }
}
