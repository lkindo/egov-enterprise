package com.company.project.service.schedule;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.schedule.LeaderSchedule;
import com.company.project.domain.schedule.LeaderScheduleRepository;
import com.company.project.domain.schedule.LeaderStatus;
import com.company.project.domain.schedule.LeaderStatusRepository;
import com.company.project.service.schedule.dto.LeaderScheduleDto;
import com.company.project.service.schedule.dto.LeaderStatusDto;
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
    private final LeaderStatusRepository leaderStatusRepository;

    @Override
    public Page<LeaderScheduleDto> getLeaderScheduleList(String searchKeyword, Pageable pageable) {
        if (searchKeyword == null || searchKeyword.isEmpty()) {
            return leaderScheduleRepository.findAll(pageable).map(LeaderScheduleDto::from);
        }
        return leaderScheduleRepository.findByScheduleNmContaining(searchKeyword, pageable).map(LeaderScheduleDto::from);
    }

    @Override
    public LeaderScheduleDto getLeaderSchedule(String scheduleId) {
        return leaderScheduleRepository.findById(scheduleId)
                .map(LeaderScheduleDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void registerLeaderSchedule(LeaderScheduleDto dto) {
        String id = "LSM_" + String.format("%013d", System.currentTimeMillis());
        LeaderSchedule schedule = LeaderSchedule.builder()
                .scheduleId(id)
                .scheduleSe(dto.getScheduleSe())
                .scheduleNm(dto.getScheduleNm())
                .scheduleCn(dto.getScheduleCn())
                .schedulePlace(dto.getSchedulePlace())
                .leaderId(dto.getLeaderId())
                .reptitSeCode(dto.getReptitSeCode())
                .beginDate(dto.getBeginDate())
                .endDate(dto.getEndDate())
                .chargerId(dto.getChargerId())
                .build();
        leaderScheduleRepository.save(schedule);
    }

    @Override
    @Transactional
    public void updateLeaderSchedule(LeaderScheduleDto dto) {
        LeaderSchedule schedule = leaderScheduleRepository.findById(dto.getScheduleId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        schedule.update(
                dto.getScheduleSe(),
                dto.getScheduleNm(),
                dto.getScheduleCn(),
                dto.getSchedulePlace(),
                dto.getLeaderId(),
                dto.getReptitSeCode(),
                dto.getBeginDate(),
                dto.getEndDate(),
                dto.getChargerId()
        );
    }

    @Override
    @Transactional
    public void deleteLeaderSchedule(String scheduleId) {
        leaderScheduleRepository.deleteById(scheduleId);
    }

    @Override
    public Page<LeaderStatusDto> getLeaderStatusList(String searchKeyword, Pageable pageable) {
        // Basic implementation, could be enhanced with user/org joins via QueryDSL
        return leaderStatusRepository.findAll(pageable).map(LeaderStatusDto::from);
    }

    @Override
    public LeaderStatusDto getLeaderStatus(String leaderId) {
        return leaderStatusRepository.findById(leaderId)
                .map(LeaderStatusDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void updateLeaderStatus(LeaderStatusDto dto) {
        leaderStatusRepository.findById(dto.getLeaderId())
                .ifPresentOrElse(
                    status -> status.updateStatus(dto.getLeaderSttus()),
                    () -> leaderStatusRepository.save(LeaderStatus.builder()
                            .leaderId(dto.getLeaderId())
                            .leaderSttus(dto.getLeaderSttus())
                            .build())
                );
    }
}
