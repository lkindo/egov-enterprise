package nuri.business.service.event;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.event.EventApplication;
import nuri.business.domain.event.EventApplicationRepository;
import nuri.business.domain.event.EventApplicationStatus;
import nuri.business.domain.event.EventInfo;
import nuri.business.domain.event.EventInfoRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.event.dto.EventApplicationDto;
import nuri.business.service.event.dto.OpenEventDto;
import nuri.foundation.core.event.NotificationRequestedEvent;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.util.EntityVersions;
import nuri.foundation.core.util.ServiceTime;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 행사 참가 신청·정원 마감(V2_152, DEC-OPS-416 ②).
 *
 * <p>신청·취소·승인·반려는 모두 행사 행을 비관적으로 잠근 뒤 판정한다 — 같은 행사의 쓰기가 한 줄로 서므로, 동시에 신청해도 정원을
 * 넘지 않고 자리 수(신청·승인 행)가 늘 실제 행과 같다(따로 세는 열을 두지 않는다). 신청은 마감일(없으면 행사 시작일)까지, 정원이
 * 있으면 자리가 남았을 때만 받는다. 반려된 신청은 다시 신청할 수 없다.
 *
 * <p>신청자는 인증 주체의 esntlId 로 고정한다(요청 본문으로 받지 않는다). 신청자 관리(목록·승인·반려)는 행사 등록자(로그인 ID 축,
 * {@code frst_rgtr_id})이거나 행사 수정 대행 권한({@code EVENT_UPDATE_ALL}) 보유자만 한다 — 행사 수정과 같은 판정이다(H3).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventApplicationService {

    private static final DateTimeFormatter YMD = DateTimeFormatter.BASIC_ISO_DATE;
    private static final int MAX_PAGE_SIZE = 100;

    private final EventInfoRepository eventInfoRepository;
    private final EventApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    /** 지금 신청을 받는 행사 — 마감일(없으면 시작일)이 오늘이거나 그 뒤인 행사. 자리 수와 내 신청 상태를 함께 싣는다. */
    public Page<OpenEventDto> getOpenEvents(Pageable pageable) {
        String today = today();
        Pageable page = PageRequest.of(pageable.getPageNumber(), Math.min(Math.max(pageable.getPageSize(), 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Order.asc("evntBgngYmd"), Sort.Order.asc("evntSn")));
        Page<EventInfo> events = eventInfoRepository.findOpenForApplication(today, page);
        if (events.isEmpty()) return events.map(event -> toOpenEvent(event, 0, null, today));
        List<Long> ids = events.stream().map(EventInfo::getEvntSn).toList();
        Map<Long, Long> seats = applicationRepository.countSeatsByEvent(ids).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        String me = currentApplicant();
        Map<Long, EventApplication> mine = applicationRepository.findByAplcntIdAndEvntSnIn(me, ids).stream()
                .collect(Collectors.toMap(EventApplication::getEvntSn, application -> application));
        return events.map(event -> toOpenEvent(event, seats.getOrDefault(event.getEvntSn(), 0L),
                mine.get(event.getEvntSn()), today));
    }

    public OpenEventDto getOpenEvent(Long evntSn) {
        EventInfo event = eventInfoRepository.findById(Objects.requireNonNull(evntSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        String today = today();
        EventApplication mine = applicationRepository.findByEvntSnAndAplcntId(evntSn, currentApplicant()).orElse(null);
        return toOpenEvent(event, applicationRepository.countSeats(evntSn), mine, today);
    }

    /**
     * 참가 신청. 마감이 지났으면 409, 이미 신청·승인됐거나 반려된 신청이면 409, 정원이 찼으면 409 다. 취소한 신청은 같은 행으로
     * 다시 신청한다.
     */
    @Transactional
    public EventApplicationDto apply(Long evntSn) {
        String applicant = currentApplicant();
        EventInfo event = lockEvent(evntSn);
        String today = today();
        if (!applicationOpen(event, today)) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE, "신청 마감이 지난 행사입니다.");
        }
        EventApplication existing = applicationRepository.findByEvntSnAndAplcntId(evntSn, applicant).orElse(null);
        if (existing != null && existing.status() != EventApplicationStatus.CANCELLED) {
            throw new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE, existing.status() == EventApplicationStatus.REJECTED
                    ? "반려된 신청은 다시 신청할 수 없습니다. 행사 담당자에게 문의해 주세요."
                    : "이미 신청한 행사입니다.");
        }
        Integer capacity = event.getPscpNope();
        if (capacity != null && applicationRepository.countSeats(evntSn) >= capacity) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE, "정원이 차서 신청할 수 없습니다.");
        }
        EventApplication saved;
        if (existing == null) {
            saved = applicationRepository.save(EventApplication.apply(evntSn, applicant, ServiceTime.now()));
        } else {
            existing.reapply(ServiceTime.now());
            saved = existing;
        }
        applicationRepository.flush();
        return EventApplicationDto.from(saved, null);
    }

    /** 본인 취소 — 신청·승인된 신청만. 행사가 시작한 뒤에는 취소할 수 없다(409). */
    @Transactional
    public void cancel(Long evntSn) {
        String applicant = currentApplicant();
        EventInfo event = lockEvent(evntSn);
        if (event.getEvntBgngYmd() != null && event.getEvntBgngYmd().compareTo(today()) < 0) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE, "이미 시작한 행사의 신청은 취소할 수 없습니다.");
        }
        EventApplication application = applicationRepository.findByEvntSnAndAplcntId(evntSn, applicant)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "신청 내역이 없습니다."));
        application.cancel(ServiceTime.now());
    }

    /** 신청자 목록(행사 등록자·수정 대행 권한자). {@code status} 가 null 이면 전체. */
    public Page<EventApplicationDto> getApplications(Long evntSn, EventApplicationStatus status, Pageable pageable) {
        EventInfo event = eventInfoRepository.findById(Objects.requireNonNull(evntSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        SecurityUtil.assertOwnerOrPermission(event.getFrstRgtrId(), "EVENT_UPDATE_ALL");
        Pageable page = PageRequest.of(pageable.getPageNumber(), Math.min(Math.max(pageable.getPageSize(), 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Order.asc("aplyDt"), Sort.Order.asc("evntAplySn")));
        Page<EventApplication> applications = status == null ? applicationRepository.findByEvntSn(evntSn, page)
                : applicationRepository.findByEvntSnAndAplySttsCd(evntSn, status.name(), page);
        Map<String, String> names = applicantNames(applications.getContent());
        return applications.map(application -> EventApplicationDto.from(application, names.get(application.getAplcntId())));
    }

    /** 승인 — 신청 상태만. 읽은 버전이 다르면 409. */
    @Transactional
    public void approve(Long evntSn, Long evntAplySn, Integer expectedVersion) {
        decide(evntSn, evntAplySn, expectedVersion, true);
    }

    /** 반려 — 신청·승인된 신청. 자리를 돌려준다. 읽은 버전이 다르면 409. */
    @Transactional
    public void reject(Long evntSn, Long evntAplySn, Integer expectedVersion) {
        decide(evntSn, evntAplySn, expectedVersion, false);
    }

    private void decide(Long evntSn, Long evntAplySn, Integer expectedVersion, boolean approved) {
        EventInfo event = lockEvent(evntSn);
        SecurityUtil.assertOwnerOrPermission(event.getFrstRgtrId(), "EVENT_UPDATE_ALL");
        EventApplication application = applicationRepository.findByEvntAplySnAndEvntSn(
                        Objects.requireNonNull(evntAplySn), evntSn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "신청 내역이 없습니다."));
        EntityVersions.assertCurrent(expectedVersion, application.getVersion());
        if (approved) application.approve(ServiceTime.now());
        else application.reject(ServiceTime.now());
        String name = event.getEvntNm() == null || event.getEvntNm().isBlank() ? "행사" : "「" + event.getEvntNm().trim() + "」";
        eventPublisher.publishEvent(new NotificationRequestedEvent(application.getAplcntId(),
                approved ? "행사 참가 신청이 승인되었습니다" : "행사 참가 신청이 반려되었습니다",
                name + (approved ? " 참가 신청이 승인되었습니다." : " 참가 신청이 반려되었습니다."), "/events"));
    }

    private EventInfo lockEvent(Long evntSn) {
        return eventInfoRepository.findByIdForUpdate(Objects.requireNonNull(evntSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    /** 신청을 받는 마지막 날 — 마감일, 없으면 행사 시작일. 둘 다 없으면 늘 받는다. */
    static boolean applicationOpen(EventInfo event, String today) {
        String last = event.getAplyDdlnYmd() != null ? event.getAplyDdlnYmd() : event.getEvntBgngYmd();
        return last == null || last.compareTo(today) >= 0;
    }

    private OpenEventDto toOpenEvent(EventInfo event, long seats, EventApplication mine, String today) {
        return new OpenEventDto(event.getEvntSn(), event.getEvntNm(), event.getEvntCn(), event.getEvntBgngYmd(),
                event.getEvntEndYmd(), event.getPicNm(), event.getPscpNope(), event.getAplyDdlnYmd(), seats,
                applicationOpen(event, today) && (event.getPscpNope() == null || seats < event.getPscpNope()),
                mine == null ? null : mine.getAplySttsCd(), mine == null ? null : mine.getVersion());
    }

    private Map<String, String> applicantNames(List<EventApplication> applications) {
        List<String> ids = applications.stream().map(EventApplication::getAplcntId).distinct().toList();
        if (ids.isEmpty()) return Map.of();
        return userRepository.findByEsntlIdIn(ids).stream()
                .filter(user -> user.getEsntlId() != null && user.getUserNm() != null)
                .collect(Collectors.toMap(User::getEsntlId, User::getUserNm, (first, second) -> first));
    }

    private static String currentApplicant() {
        return SecurityUtil.getCurrentEsntlId().filter(id -> !id.isBlank())
                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
    }

    static String today() {
        return LocalDate.now(ServiceTime.clock()).format(YMD);
    }
}
