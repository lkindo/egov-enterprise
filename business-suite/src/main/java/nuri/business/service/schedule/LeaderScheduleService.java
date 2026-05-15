package nuri.business.service.schedule;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.schedule.LeaderSchedule;
import nuri.business.domain.schedule.LeaderScheduleRepository;
import nuri.business.service.schedule.dto.LeaderScheduleDto;
import nuri.business.service.schedule.dto.LeaderStatusDto;
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
                .findBySchdlTtlContaining(keyword == null ? "" : keyword, Objects.requireNonNull(pageable))
                .map(LeaderScheduleDto::from);
    }

    @Override
    public LeaderScheduleDto getLeaderSchedule(String schdlId) {
        return leaderScheduleRepository.findById(Objects.requireNonNull(schdlId))
                .map(LeaderScheduleDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createLeaderSchedule(String userId, LeaderScheduleDto dto) {
        String id = "LSCH_" + System.currentTimeMillis();
        LeaderSchedule entity = LeaderSchedule.builder()
                .schdlId(id)
                .schdlSeCd(dto.getSchdlSeCd())
                .schdlTtl(dto.getSchdlTtl())
                .schdlCn(dto.getSchdlCn())
                .schdlPlcNm(dto.getSchdlPlcNm())
                .leaderId(dto.getLeaderId())
                .reptitSeCd(dto.getReptitSeCd())
                .schdlIpcrCd(dto.getSchdlIpcrCd())
                .bgngYmd(dto.getBgngYmd())
                .endYmd(dto.getEndYmd())
                .schdlPicId(dto.getSchdlPicId())
                .build();
        entity.setCreatedBy(userId);
        leaderScheduleRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateLeaderSchedule(String schdlId, String userId, LeaderScheduleDto dto) {
        LeaderSchedule schedule = leaderScheduleRepository.findById(Objects.requireNonNull(schdlId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        schedule.update(
                dto.getSchdlSeCd(),
                dto.getSchdlTtl(),
                dto.getSchdlCn(),
                dto.getSchdlPlcNm(),
                dto.getLeaderId(),
                dto.getReptitSeCd(),
                dto.getSchdlIpcrCd(),
                dto.getBgngYmd(),
                dto.getEndYmd(),
                dto.getSchdlPicId(),
                userId);
    }

    @Override
    @Transactional
    public void deleteLeaderSchedule(String schdlId) {
        leaderScheduleRepository.deleteById(Objects.requireNonNull(schdlId));
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
