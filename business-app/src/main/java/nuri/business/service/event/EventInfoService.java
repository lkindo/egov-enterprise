package nuri.business.service.event;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.security.util.SecurityUtil;
 
import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.event.EventApplicationRepository;
import nuri.business.domain.event.EventInfo;
import nuri.business.domain.event.EventInfoRepository;
import nuri.business.domain.event.ExternalHrRepository;
import nuri.business.service.event.dto.EventInfoDto;
import nuri.business.service.event.dto.EventInfoMapper;
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
    private final ExternalHrRepository externalHrRepository;
    private final EventInfoMapper eventInfoMapper;
    private final EventApplicationRepository eventApplicationRepository;

    public Page<EventInfoDto> getEventList(String searchWrd, Pageable pageable) {
        log.debug("Fetching event list");
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
        SecurityUtil.assertPermission("EVENT_CREATE");
        log.info("Creating new event");
 
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
                .pscpNope(dto.getPscpNope())
                .aplyDdlnYmd(applicationDeadline(dto))
                .build();

        EventInfo saved = eventInfoRepository.save(Objects.requireNonNull(eventInfo));
        log.info("Event created successfully: {}", saved.getEvntSn());
        return saved.getEvntSn();
    }
 
    @Transactional
    public void updateEvent(Long evntSn, String userId, EventInfoDto dto) {
        SecurityUtil.assertPermission("EVENT_UPDATE");
        log.info("Updating event serial number: {}", evntSn);
        EventInfo eventInfo = eventInfoRepository.findByIdForUpdate(Objects.requireNonNull(evntSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.foundation.core.util.EntityVersions.assertCurrent(dto.getVersion(), eventInfo.getVersion());
        // [V2_152] 정원을 이미 자리를 차지한 신청 수보다 작게 줄이지 않는다 — 줄이면 화면의 남은 자리가 음수가 되고
        //   누구를 떨어뜨릴지 정할 규칙이 없다. 행 잠금(findByIdForUpdate) 뒤라 동시 신청과 맞물리지 않는다.
        if (dto.getPscpNope() != null) {
            long seats = eventApplicationRepository.countSeats(evntSn);
            if (seats > dto.getPscpNope()) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                        "이미 신청한 인원(" + seats + "명)보다 신청 정원을 작게 줄일 수 없습니다. 신청을 먼저 반려하세요.");
            }
        }

        eventInfo.update(
                dto.getBizYr(),
                dto.getEvntNm(),
                dto.getEvntCn(),
                normalizeYmd(dto.getEvntBgngYmd()),
                normalizeYmd(dto.getEvntEndYmd()),
                dto.getEvntUseCnt(),
                dto.getPicNm(),
                dto.getPrepMttr(),
                dto.getEvntTypeCd(),
                dto.getPscpNope(),
                applicationDeadline(dto));
        log.info("Event updated successfully: {}", evntSn);
    }
 
    /**
     * 행사 일자(YYYY-MM-DD 또는 YYYYMMDD)를 물리 컬럼 표준(YYYYMMDD, varchar(8))으로 정규화한다.
     * V2_18 스키마 동기화 — 하이픈 데이터 유입 경로 봉쇄.
     */
    private static String normalizeYmd(String ymd) {
        return ymd == null ? null : ymd.replace("-", "");
    }

    /** 신청 마감일(V2_152)을 정해야 신청을 받는다(비우면 받지 않는다). 행사 종료일보다 늦은 마감일은 받지 않는다(400). */
    private static String applicationDeadline(EventInfoDto dto) {
        String deadline = normalizeYmd(dto.getAplyDdlnYmd());
        if (deadline == null || deadline.isBlank()) {
            return null;
        }
        String end = normalizeYmd(dto.getEvntEndYmd());
        if (end != null && !end.isBlank() && deadline.compareTo(end) > 0) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "신청 마감일은 행사 종료일보다 늦을 수 없습니다.");
        }
        return deadline;
    }

    @Transactional
    public void deleteEvent(Long evntSn) {
        SecurityUtil.assertPermission("EVENT_DELETE");
        log.warn("Deleting event serial number: {}", evntSn);
        // 신청·취소·승인(EventApplicationService)과 같은 행 잠금 뒤에 센다. 잠그지 않고 세면, 센 뒤 커밋 전에 들어온 신청이
        //   아래 삭제와 함께 CASCADE 로 지워진다 — 신청자는 접수됐다는 응답을 받고도 기록이 사라진다.
        EventInfo eventInfo = eventInfoRepository.findByIdForUpdate(Objects.requireNonNull(evntSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        // [2026-09-26 DIP V9] 외부인사가 이 행사를 참조한다(fk_tb_extrl_hr_info_tb_event_info, NO ACTION).
        //   종전에는 삭제가 DB 무결성 오류로 끝나 사용자는 이유를 몰랐다. 건수를 밝혀 거부하고,
        //   외부인사를 자동으로 지우지 않는다 — 명단 삭제는 사용자가 확인하고 할 일이다.
        long externalHrCount = externalHrRepository.countByEvntSn(evntSn);
        if (externalHrCount > 0) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE,
                    "외부인사 " + externalHrCount + "명이 등록된 행사는 삭제할 수 없습니다. 외부인사를 먼저 삭제하세요.");
        }
        // [V2_152] 자리를 차지한 신청(승인 대기·승인)이 있으면 지우지 않는다 — 신청 행은 행사와 함께 지워지므로(ON DELETE CASCADE)
        //   신청자가 모르게 사라진다. 반려·취소만 남은 행사는 지운다.
        long seats = eventApplicationRepository.countSeats(evntSn);
        if (seats > 0) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE,
                    "참가 신청 " + seats + "건이 있는 행사는 삭제할 수 없습니다. 신청을 먼저 반려하세요.");
        }
        eventInfoRepository.delete(Objects.requireNonNull(eventInfo));
        log.info("Event deleted successfully: {}", evntSn);
    }
}
