package com.company.project.service.schedule;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.schedule.LeaderSchedule;
import com.company.project.domain.schedule.LeaderScheduleRepository;
import com.company.project.service.schedule.dto.LeaderScheduleDto;
import com.company.project.service.schedule.dto.LeaderStatusDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeaderScheduleService implements EgovLeaderScheduleService {

    private final LeaderScheduleRepository leaderScheduleRepository;

    @Override
    public Page<LeaderScheduleDto> getLeaderScheduleList(String keyword, Pageable pageable) {
        return leaderScheduleRepository
                .findByScheduleNmContaining(keyword == null ? "" : keyword, Objects.requireNonNull(pageable))
                .map(LeaderScheduleDto::from);
    }

    @Override
    public LeaderScheduleDto getLeaderSchedule(String scheduleId) {
        return leaderScheduleRepository.findById(Objects.requireNonNull(scheduleId))
                .map(LeaderScheduleDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createLeaderSchedule(String userId, LeaderScheduleDto dto) {
        String id = "LSCH_" + String.format("%014d", System.currentTimeMillis());
        LeaderSchedule entity = LeaderSchedule.builder()
                .scheduleId(id)
                .scheduleSe(dto.getScheduleSe())
                .scheduleNm(dto.getScheduleNm())
                .scheduleCn(dto.getScheduleCn())
                .schedulePlace(dto.getSchedulePlace())
                .leaderId(dto.getLeaderId())
                .reptitSeCode(dto.getReptitSeCode())
                .scheduleIpcrCode(dto.getScheduleIpcrCode())
                .beginDate(dto.getBeginDate())
                .endDate(dto.getEndDate())
                .chargerId(dto.getChargerId())
                .build();
        entity.setCreatedBy(userId);
        leaderScheduleRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateLeaderSchedule(String scheduleId, String userId, LeaderScheduleDto dto) {
        LeaderSchedule schedule = leaderScheduleRepository.findById(Objects.requireNonNull(scheduleId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        schedule.update(
                dto.getScheduleSe(),
                dto.getScheduleNm(),
                dto.getScheduleCn(),
                dto.getSchedulePlace(),
                dto.getLeaderId(),
                dto.getReptitSeCode(),
                dto.getScheduleIpcrCode(),
                dto.getBeginDate(),
                dto.getEndDate(),
                dto.getChargerId(),
                userId);
    }

    @Override
    @Transactional
    public void deleteLeaderSchedule(String scheduleId) {
        leaderScheduleRepository.deleteById(Objects.requireNonNull(scheduleId));
    }

    @Override
    public Page<LeaderStatusDto> getLeaderStatusList(String searchKeyword, Pageable pageable) {
        // Mock implementation
        return Page.empty();
    }

    @Override
    public LeaderStatusDto getLeaderStatus(String leaderId) {
        // Mock implementation
        return null;
    }

    @Override
    @Transactional
    public void updateLeaderStatus(LeaderStatusDto dto) {
        // Mock implementation
    }
}
