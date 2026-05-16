package nuri.business.service.schedule;

import nuri.business.domain.schedule.LeaderSchedule;
import nuri.business.domain.schedule.LeaderScheduleRepository;
import nuri.business.service.schedule.dto.LeaderScheduleDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.service.BaseAbstractService;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeaderScheduleService extends BaseAbstractService {

    private final LeaderScheduleRepository leaderScheduleRepository;
    private final EgovIdGnrService egovLeaderSchdlIdGnrService;

    public Page<LeaderScheduleDto> getLeaderScheduleList(String searchCondition, String searchKeyword, @NonNull Pageable pageable) {
        return leaderScheduleRepository.searchLeaderSchedules(searchCondition, searchKeyword, Objects.requireNonNull(pageable))
                .map(this::toDto);
    }

    public LeaderScheduleDto getLeaderSchedule(@NonNull String schdlId) {
        return leaderScheduleRepository.findById(schdlId)
                .map(this::toDto)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public void createLeaderSchedule(String userId, LeaderScheduleDto dto) throws Exception {
        String schdlId = egovLeaderSchdlIdGnrService.getNextStringId();
        LeaderSchedule entity = LeaderSchedule.builder()
                .schdlId(schdlId)
                .schdlSeCd(dto.getSchdlSeCd())
                .leaderId(dto.getLeaderId())
                .schdlTtl(dto.getSchdlTtl())
                .schdlCn(dto.getSchdlCn())
                .reptitSeCd(dto.getReptitSeCd())
                .schdlIpcrCd(dto.getSchdlIpcrCd())
                .bgngYmd(dto.getBgngYmd())
                .endYmd(dto.getEndYmd())
                .schdlPicId(dto.getSchdlPicId())
                .createdBy(userId)
                .build();
        leaderScheduleRepository.save(entity);
    }

    @Transactional
    public void updateLeaderSchedule(String userId, LeaderScheduleDto dto) {
        LeaderSchedule entity = leaderScheduleRepository.findById(Objects.requireNonNull(dto.getSchdlId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.update(
                dto.getSchdlSeCd(),
                dto.getLeaderId(),
                dto.getSchdlTtl(),
                dto.getSchdlCn(),
                dto.getReptitSeCd(),
                dto.getSchdlIpcrCd(),
                dto.getBgngYmd(),
                dto.getEndYmd(),
                dto.getSchdlPicId());
        
        entity.setLastModifiedBy(userId);
    }

    @Transactional
    public void deleteLeaderSchedule(@NonNull String schdlId) {
        leaderScheduleRepository.deleteById(schdlId);
    }

    private LeaderScheduleDto toDto(LeaderSchedule entity) {
        return LeaderScheduleDto.builder()
                .schdlId(entity.getSchdlId())
                .leaderId(entity.getLeaderId())
                .schdlTtl(entity.getSchdlTtl())
                .schdlCn(entity.getSchdlCn())
                .schdlBgngYmd(entity.getBgngYmd())
                .schdlEndYmd(entity.getEndYmd())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
