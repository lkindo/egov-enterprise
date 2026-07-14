package nuri.business.service.operation;
import nuri.foundation.core.exception.CommonErrorCode;
 
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.operation.EventInfo;
import nuri.business.repository.operation.EventInfoRepository;
import nuri.business.service.operation.dto.EventInfoDto;
import nuri.business.service.operation.dto.EventInfoMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
 
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventInfoService {
 
    private final EventInfoRepository eventInfoRepository;
    private final EventInfoMapper eventInfoMapper;

    public Page<EventInfoDto> getEventList(String searchWrd, Pageable pageable) {
        log.debug("Fetching event list with search: {}", searchWrd);
        if (searchWrd == null || searchWrd.trim().isEmpty()) {
            return eventInfoRepository.findAll(Objects.requireNonNull(pageable)).map(eventInfoMapper::toDto);
        }
        return eventInfoRepository.findBySearchWrd(searchWrd, pageable).map(eventInfoMapper::toDto);
    }
 
    public EventInfoDto getEvent(String eventId) {
        log.debug("Fetching event details for ID: {}", eventId);
        EventInfo eventInfo = eventInfoRepository.findById(Objects.requireNonNull(eventId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        return eventInfoMapper.toDto(eventInfo);
    }
 
    @Transactional
    public String createEvent(String userId, EventInfoDto dto) {
        log.info("Creating new event by user: {}", userId);
        String eventId = "EVT_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 13);
 
        EventInfo eventInfo = EventInfo.builder()
                .evntId(eventId)
                .bizYr(dto.getBizYr())
                .bizCd(dto.getBizCd())
                .evntCn(dto.getEvntCn())
                .evntBgngYmd(dto.getEvntBgngYmd())
                .evntEndYmd(dto.getEvntEndYmd())
                .evntUseCnt(dto.getEvntUseCnt())
                .picNm(dto.getPicNm())
                .prepMttr(dto.getPrepMttr())
                .evntTypeCd(dto.getEvntTypeCd())
                .evntAprvYn(dto.getEvntAprvYn())
                .evntAprvYmd(dto.getEvntAprvYmd())
                .build();
 
        EventInfo saved = eventInfoRepository.save(Objects.requireNonNull(eventInfo));
        log.info("Event created successfully: {}", saved.getEvntId());
        return eventId;
    }
 
    @Transactional
    public void updateEvent(String eventId, String userId, EventInfoDto dto) {
        log.info("Updating event ID: {} by user: {}", eventId, userId);
        EventInfo eventInfo = eventInfoRepository.findById(Objects.requireNonNull(eventId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
 
        EventInfo updated = EventInfo.builder()
                .evntId(eventId)
                .bizYr(dto.getBizYr())
                .bizCd(dto.getBizCd())
                .evntCn(dto.getEvntCn())
                .evntBgngYmd(dto.getEvntBgngYmd())
                .evntEndYmd(dto.getEvntEndYmd())
                .evntUseCnt(dto.getEvntUseCnt())
                .picNm(dto.getPicNm())
                .prepMttr(dto.getPrepMttr())
                .evntTypeCd(dto.getEvntTypeCd())
                .evntAprvYn(dto.getEvntAprvYn())
                .evntAprvYmd(dto.getEvntAprvYmd())
                .build();
        // 재빌드-merge 패턴: 작성자(frstRgtrId)는 @CreatedBy 가 update 시 재적용되지 않으므로 기존 값 보존
        updated.setFrstRgtrId(eventInfo.getFrstRgtrId());
        eventInfoRepository.save(updated);
        log.info("Event updated successfully: {}", eventId);
    }
 
    @Transactional
    public void deleteEvent(String eventId) {
        log.warn("Deleting event ID: {}", eventId);
        EventInfo eventInfo = eventInfoRepository.findById(Objects.requireNonNull(eventId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        eventInfoRepository.delete(Objects.requireNonNull(eventInfo));
        log.info("Event deleted successfully: {}", eventId);
    }
}
