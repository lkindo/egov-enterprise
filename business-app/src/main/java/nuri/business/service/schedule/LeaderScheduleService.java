package nuri.business.service.schedule;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.schedule.LeaderSchedule;
import nuri.business.domain.schedule.LeaderScheduleRepository;
import nuri.business.domain.schedule.LeaderStatus;
import nuri.business.domain.schedule.LeaderStatusRepository;
import nuri.business.service.schedule.dto.LeaderScheduleDto;
import nuri.business.service.schedule.dto.LeaderStatusMapper;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
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
public class LeaderScheduleService extends BaseAbstractService implements EgovLeaderScheduleService {

    private final LeaderScheduleRepository leaderScheduleRepository;
    private final LeaderStatusRepository leaderStatusRepository;
    private final EgovIdGnrService egovLeaderSchdlIdGnrService;
    private final LeaderStatusMapper leaderStatusMapper;

    @Override
    public Page<LeaderScheduleDto> getLeaderScheduleList(String keyword, @NonNull Pageable pageable) {
        return leaderScheduleRepository.searchLeaderSchedules(null, keyword, Objects.requireNonNull(pageable))
                .map(this::toDto);
    }

    @Override
    public LeaderScheduleDto getLeaderSchedule(@NonNull String schdlId) {
        return leaderScheduleRepository.findById(schdlId)
                .map(this::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createLeaderSchedule(String userId, LeaderScheduleDto dto) {
        try {
            String schdlId = egovLeaderSchdlIdGnrService.getNextStringId();
            LeaderSchedule entity = LeaderSchedule.builder()
                    .schdlId(schdlId)
                    .schdlSeCd(dto.getSchdlSeCd())
                    .leaderId(dto.getLeaderId())
                    .schdlNm(dto.getSchdlNm())
                    .schdlCn(dto.getSchdlCn())
                    .reptSeCd(dto.getReptSeCd())
                    .schdlImprtCd(dto.getSchdlImprtCd())
                    .schdlBgngYmd(dto.getSchdlBgngYmd())
                    .schdlEndYmd(dto.getSchdlEndYmd())
                    .schdlPicId(dto.getSchdlPicId())
                    .schdlPlcNm(dto.getSchdlPlcNm())
                    .build();
            // frstRgtrId 는 표준 Auditing(@CreatedBy)이 설정하므로 빌더에서 제외
            leaderScheduleRepository.save(entity);
            return schdlId;
        } catch (Exception e) {
            throw new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional
    public void updateLeaderSchedule(String schdlId, String userId, LeaderScheduleDto dto) {
        LeaderSchedule entity = leaderScheduleRepository.findById(Objects.requireNonNull(schdlId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        entity.update(
                dto.getSchdlSeCd(),
                dto.getLeaderId(),
                dto.getSchdlNm(),
                dto.getSchdlCn(),
                dto.getReptSeCd(),
                dto.getSchdlImprtCd(),
                dto.getSchdlBgngYmd(),
                dto.getSchdlEndYmd(),
                dto.getSchdlPicId(),
                dto.getSchdlPlcNm());
        
        entity.setLastMdfrId(userId);
    }

    @Override
    @Transactional
    public void deleteLeaderSchedule(@NonNull String schdlId) {
        leaderScheduleRepository.deleteById(schdlId);
    }

    @Override
    public Page<nuri.business.service.schedule.dto.LeaderStatusDto> getLeaderStatusList(String searchKeyword, Pageable pageable) {
        if (searchKeyword != null && !searchKeyword.trim().isEmpty()) {
            return leaderStatusRepository.findByLeaderIdContaining(searchKeyword, pageable)
                    .map(leaderStatusMapper::toDto);
        }
        return leaderStatusRepository.findAll(pageable)
                .map(leaderStatusMapper::toDto);
    }

    @Override
    public nuri.business.service.schedule.dto.LeaderStatusDto getLeaderStatus(String leaderId) {
        return leaderStatusRepository.findById(leaderId)
                .map(leaderStatusMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void updateLeaderStatus(nuri.business.service.schedule.dto.LeaderStatusDto dto) {
        LeaderStatus entity = leaderStatusRepository.findById(dto.getLeaderId())
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.updateStatus(dto.getLeaderSttsCd());
    }

    private LeaderScheduleDto toDto(LeaderSchedule entity) {
        return LeaderScheduleDto.builder()
                .schdlId(entity.getSchdlId())
                .leaderId(entity.getLeaderId())
                .schdlNm(entity.getSchdlNm())
                .schdlCn(entity.getSchdlCn())
                .schdlBgngYmd(entity.getSchdlBgngYmd())
                .schdlEndYmd(entity.getSchdlEndYmd())
                .schdlPlcNm(entity.getSchdlPlcNm())
                .crtDt(entity.getCrtDt())
                .build();
    }
}
