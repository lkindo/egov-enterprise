package nuri.business.service.operation;
import nuri.foundation.core.exception.CommonErrorCode;
 
import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.operation.EventInfo;
import nuri.business.domain.operation.EventInfoRepository;
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
 
    public EventInfoDto getEvent(Long evntSn) {
        log.debug("Fetching event details for serial number: {}", evntSn);
        EventInfo eventInfo = eventInfoRepository.findById(Objects.requireNonNull(evntSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        return eventInfoMapper.toDto(eventInfo);
    }
 
    @Transactional
    public Long createEvent(String userId, EventInfoDto dto) {
        log.info("Creating new event by user: {}", userId);
 
        EventInfo eventInfo = EventInfo.builder()
                .bizYr(dto.getBizYr())
                .evntNm(dto.getEvntNm())
                .evntCn(dto.getEvntCn())
                .evntBgngYmd(normalizeYmd(dto.getEvntBgngYmd()))
                .evntEndYmd(normalizeYmd(dto.getEvntEndYmd()))
                .evntUseCnt(dto.getEvntUseCnt())
                .picNm(dto.getPicNm())
                .prepMttr(dto.getPrepMttr())
                .evntTypeCd(dto.getEvntTypeCd())
                .evntAprvYn(dto.getEvntAprvYn())
                .evntAprvYmd(normalizeYmd(dto.getEvntAprvYmd()))
                .build();

        EventInfo saved = eventInfoRepository.save(Objects.requireNonNull(eventInfo));
        log.info("Event created successfully: {}", saved.getEvntSn());
        return saved.getEvntSn();
    }
 
    @Transactional
    public void updateEvent(Long evntSn, String userId, EventInfoDto dto) {
        log.info("Updating event serial number: {} by user: {}", evntSn, userId);
        EventInfo eventInfo = eventInfoRepository.findById(Objects.requireNonNull(evntSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
 
        EventInfo updated = EventInfo.builder()
                .evntSn(evntSn)
                .bizYr(dto.getBizYr())
                .evntNm(dto.getEvntNm())
                .evntCn(dto.getEvntCn())
                .evntBgngYmd(normalizeYmd(dto.getEvntBgngYmd()))
                .evntEndYmd(normalizeYmd(dto.getEvntEndYmd()))
                .evntUseCnt(dto.getEvntUseCnt())
                .picNm(dto.getPicNm())
                .prepMttr(dto.getPrepMttr())
                .evntTypeCd(dto.getEvntTypeCd())
                .evntAprvYn(dto.getEvntAprvYn())
                .evntAprvYmd(normalizeYmd(dto.getEvntAprvYmd()))
                .build();
        // 재빌드-merge 패턴: 작성자(frstRgtrId)는 @CreatedBy 가 update 시 재적용되지 않으므로 기존 값 보존
        updated.setFrstRgtrId(eventInfo.getFrstRgtrId());
        eventInfoRepository.save(updated);
        log.info("Event updated successfully: {}", evntSn);
    }
 
    /**
     * 행사 일자(YYYY-MM-DD 또는 YYYYMMDD)를 물리 컬럼 표준(YYYYMMDD, varchar(8))으로 정규화한다.
     * V2_18 스키마 동기화 — 하이픈 데이터 유입 경로 봉쇄.
     */
    private static String normalizeYmd(String ymd) {
        return ymd == null ? null : ymd.replace("-", "");
    }

    @Transactional
    public void deleteEvent(Long evntSn) {
        log.warn("Deleting event serial number: {}", evntSn);
        EventInfo eventInfo = eventInfoRepository.findById(Objects.requireNonNull(evntSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        eventInfoRepository.delete(Objects.requireNonNull(eventInfo));
        log.info("Event deleted successfully: {}", evntSn);
    }
}
