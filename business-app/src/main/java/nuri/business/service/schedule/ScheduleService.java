package nuri.business.service.schedule;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.schedule.Schedule;
import nuri.business.domain.schedule.ScheduleRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.schedule.dto.ScheduleDto;
import nuri.business.service.schedule.dto.ScheduleMapper;
import nuri.foundation.core.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.jspecify.annotations.NonNull;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final ScheduleMapper scheduleMapper;
    private final UserRepository userRepository;
    private final AttachmentAssignmentPolicy attachmentAssignmentPolicy;

    /**
     * 소속 조직 미배정(ognz_id = null) 사용자의 폴백 조직. tb_ognz_info 의 '기본조직' 이다.
     * 현재 사용자 전원이 미배정 상태라 폴백이 사실상의 기본 부서로 동작하며,
     * 추후 사용자에게 실제 부서를 배정하면 자연히 부서별로 분리된다.
     * 미배정자끼리 '부서 공유' 일정을 보는 이 동작은 유지하기로 정했다(DEC-OPS-375).
     */
    private static final String DEFAULT_ORG_ID = "ORGNZT_0000000000000";

    /** 로그인 사용자의 소속 조직 ID. 미배정이면 기본조직으로 폴백한다. */
    private String resolveDeptId(String loginId) {
        if (loginId == null || loginId.isBlank()) {
            return DEFAULT_ORG_ID;
        }
        return userRepository.findByUserId(loginId)
                .map(u -> u.getOgnzId())
                .filter(ognzId -> ognzId != null && !ognzId.isBlank())
                .orElse(DEFAULT_ORG_ID);
    }

    public Page<ScheduleDto> getScheduleList(String userId, @NonNull Pageable pageable) {
        return getScheduleList(userId, null, pageable);
    }

    /** 개인 축 목록 — 내가 담당자인 일정. */
    public Page<ScheduleDto> getScheduleList(String userId, String searchWrd, @NonNull Pageable pageable) {
        return scheduleRepository.searchSchedules(null, userId, searchWrd, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    /** 부서 축 목록 — 로그인 사용자와 같은 부서의 일정. (종전에는 담당자 축이라 '내가 만든 것'만 보였다.) */
    public Page<ScheduleDto> getDeptScheduleList(String schdlSeCd, String loginId, String searchWrd, @NonNull Pageable pageable) {
        return scheduleRepository.searchDeptSchedules(schdlSeCd, resolveDeptId(loginId), searchWrd, Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    /** 캘린더용 월별 조회 — 내 일정과 우리 부서 일정을 합쳐서 돌려준다. */
    public List<ScheduleDto> getMonthlySchedule(String userId, String yearMonth) {
        String month = requireYearMonth(yearMonth);
        return scheduleRepository.findMonthlySchedules(userId, resolveDeptId(userId), month).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /** 월별 조회 키 — 6자리 yyyyMM. 질의가 이 값에 '01'·'31' 을 붙여 문자열로 비교하므로 형식이 다르면 엉뚱한 범위가 된다. */
    private static final java.util.regex.Pattern YEAR_MONTH = java.util.regex.Pattern.compile("[0-9]{4}(?:0[1-9]|1[0-2])");

    /**
     * [2026-10-18] 월 형식을 확인한다. 종전에는 검사 없이 질의에 붙여, {@code 2026-10}·{@code 202613}·빈 값이 오류 없이
     * 빈 목록이나 다른 달의 일정을 돌려줬다. 형식이 아니면 400 이다.
     */
    private static String requireYearMonth(String yearMonth) {
        if (yearMonth == null || !YEAR_MONTH.matcher(yearMonth).matches() || yearMonth.startsWith("0000")) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "조회할 달은 yyyyMM 형식(예: 202610)이어야 합니다.");
        }
        return yearMonth;
    }

    public List<ScheduleDto> getScheduleListByDateRange(String userId, String startDate, String endDate) {
        return scheduleRepository.findSchedulesByDateRange(userId, startDate, endDate).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<ScheduleDto> getScheduleListByDateRange(String schdlSeCd, String ownerId, String startDate, String endDate) {
        return scheduleRepository.findSchedulesByDateRange(schdlSeCd, ownerId, startDate, endDate).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public ScheduleDto getSchedule(@NonNull Long schdlSn) {
        Schedule entity = scheduleRepository.findById(schdlSn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        // 월별·부서 목록과 같은 공개 범위다. 인증된 같은 부서원에게 공유한 일정만 읽게 하며 쓰기 소유권은 유지한다.
        boolean sharedWithCurrentDepartment = "1".equals(entity.getSchdlSeCd())
                && nuri.business.security.util.SecurityUtil.getCurrentLoginId()
                .filter(loginId -> !loginId.isBlank())
                .filter(loginId -> Objects.equals(entity.getSchdlDeptId(), resolveDeptId(loginId)))
                .isPresent();
        if (!sharedWithCurrentDepartment) {
            nuri.business.security.util.SecurityUtil.assertOwnerOrPermission(entity.getFrstRgtrId(), "SCHEDULE_READ_ALL");
        }
        return convertToDto(entity);
    }

    /**
     * [2026-10-18] 등록·수정의 시작일은 필수다. 월별 달력({@code findMonthlySchedules})과 기간 조회가 시작일로 거르므로
     * 시작일 없이 저장된 일정은 어느 달력에도 나타나지 않았다. 화면은 이 칸을 필수로 받아 왔고, API 를 직접 부르는 경로만
     * 비어 들어왔다. 응답 계약은 그대로 둔다 — 시작일 없이 저장된 기존 일정도 목록에서 계속 읽혀야 한다({@code ScheduleDto}).
     */
    private static void requireStartDate(ScheduleDto dto) {
        if (dto.getSchdlBgngYmd() == null || dto.getSchdlBgngYmd().isBlank()) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "일정 시작일을 입력하세요.");
        }
    }

    private static String normalizeEndDate(String endDate) {
        return "".equals(endDate) ? null : endDate;
    }

    @Transactional
    public Long createSchedule(String userId, ScheduleDto dto) {
        requireStartDate(dto);
        Long atchFileSn = dto.getAtchFileSn();
        if (atchFileSn != null) {
            attachmentAssignmentPolicy.assertAssignable(atchFileSn);
        }
        // [소유자 고정] 조회 4종(searchSchedules/findMonthlySchedules/findSchedulesByDateRange)이 모두
        //   s.schdlPicId = :loginId 로 필터한다. 담당자를 클라이언트 DTO 값으로 두면
        //   ① 미전송 시 null 이 되어 등록해도 어떤 목록에도 나타나지 않고(저장축↔조회축 단절),
        //   ② 타인의 loginId 를 실어 보내 남의 일정으로 위조할 수 있다(매스어사인먼트).
        //   그래서 인증 주체(loginId)로 고정한다 — BE 헌법 제8조 2항(소유 컬럼이 실제 저장하는 축과 일치),
        //   BoardService.createPost 의 저자 위조 차단과 동일한 패턴.
        Schedule entity = Schedule.builder()
                .schdlSeCd(dto.getSchdlSeCd())
                // [부서 귀속] 소속 조직은 서버가 정한다. 클라이언트 값을 신뢰하면 남의 부서 일정으로
                //   끼워 넣을 수 있고, 미전송 시 null 이 되어 부서 목록에서 사라진다.
                .schdlDeptId(resolveDeptId(userId))
                .schdlKndCd(dto.getSchdlKndCd())
                .schdlNm(dto.getSchdlNm())
                .schdlCn(dto.getSchdlCn())
                .schdlBgngYmd(dto.getSchdlBgngYmd())
                .schdlEndYmd(normalizeEndDate(dto.getSchdlEndYmd()))
                .schdlPlcNm(dto.getSchdlPlcNm())
                .schdlImprtCd(dto.getSchdlImprtCd())
                .schdlPicId(userId)
                .schdlIpAddr(dto.getSchdlIpAddr())
                .reptSeCd(dto.getReptSeCd())
                .atchFileSn(atchFileSn)
                .build();
        // frstRgtrId 는 표준 Auditing(@CreatedBy)이 설정하므로 빌더에서 제외
        return scheduleRepository.save(entity).getSchdlSn();
    }

    @Transactional
    public void updateSchedule(Long schdlSn, String userId, ScheduleDto dto) {
        Schedule entity = scheduleRepository.findById(Objects.requireNonNull(schdlSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrPermission(entity.getFrstRgtrId(), "SCHEDULE_UPDATE_ALL"); // [IDOR] 소유자/관리자만 수정
        // [2026-10-18] 화면이 읽은 버전과 다르면 다른 사람이 먼저 고친 것이다 — 덮지 않고 409 로 알린다(인가 판정 뒤).
        nuri.foundation.core.util.EntityVersions.assertCurrent(dto.getVersion(), entity.getVersion());
        requireStartDate(dto);

        Long atchFileSn = dto.getAtchFileSn();
        if (atchFileSn != null && !Objects.equals(entity.getAtchFileSn(), atchFileSn)) {
            attachmentAssignmentPolicy.assertAssignable(atchFileSn);
        }

        boolean becomesDepartmentShared = "1".equals(dto.getSchdlSeCd()) && !"1".equals(entity.getSchdlSeCd());
        entity.updateAll(
                dto.getSchdlNm(),
                dto.getSchdlCn(),
                dto.getSchdlSeCd(),
                dto.getSchdlKndCd(),
                dto.getSchdlBgngYmd(),
                normalizeEndDate(dto.getSchdlEndYmd()),
                dto.getSchdlPlcNm(),
                dto.getSchdlImprtCd(),
                // [소유자 불변] 담당자는 등록 시 인증 주체로 고정되며 수정으로 재지정하지 않는다.
                //   DTO 값을 그대로 넘기면 ① null 전송 시 담당자가 지워져 목록(schdlPicId 필터)에서 사라지고
                //   ② 타인 loginId 로 바꿔 남의 일정으로 넘길 수 있다. create 만 막으면 이 경로로 우회된다.
                entity.getSchdlPicId(),
                dto.getReptSeCd(),
                atchFileSn != null ? atchFileSn : entity.getAtchFileSn());
        // 등록 뒤 소유자의 부서가 바뀌었으면 옛 부서에 공유된다. 대행 수정자의 부서로 옮기면 다른 부서에 내용이 열리므로 소유자 기준이다.
        if (becomesDepartmentShared) {
            entity.shareWithDepartment(resolveDeptId(entity.getFrstRgtrId()));
        }
        
        entity.setLastMdfrId(userId);
    }

    @Transactional
    public void deleteSchedule(@NonNull Long schdlSn, String userId) {
        Schedule entity = scheduleRepository.findById(schdlSn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // [IDOR/정체성 수정] 기존 가드는 userId(컨트롤러 esntlId)와 frstRgtrId(loginId)를 비교해 항상 deny-all 이었다.
        // SecurityUtil 이 SecurityContext 에서 loginId 를 읽어 소유자/관리자를 올바로 판정한다.
        nuri.business.security.util.SecurityUtil.assertOwnerOrPermission(entity.getFrstRgtrId(), "SCHEDULE_DELETE_ALL");

        scheduleRepository.delete(entity);
    }

    private ScheduleDto convertToDto(Schedule entity) {
        ScheduleDto dto = scheduleMapper.toDto(entity);
        dto.setEditable(canModify(entity, "SCHEDULE_UPDATE", "SCHEDULE_UPDATE_ALL"));
        dto.setDeletable(canModify(entity, "SCHEDULE_DELETE", "SCHEDULE_DELETE_ALL"));
        return dto;
    }

    /**
     * 수정·삭제 가능 여부 — {@code assertOwnerOrPermission(frstRgtrId, 전체권한)} 과 컨트롤러 기능 권한을 예외 대신 boolean 으로
     * 계산한다(2026-09-26 DIP B4 P5). 부서 일정은 같은 부서 사람에게 보이지만 고칠 수 있는 사람은 등록자·관리자뿐이라,
     * 화면이 소유를 모르고 버튼을 그리면 누를 때마다 403 이 났다. 표시용 힌트이고 인가는 쓰기 경로가 집행한다.
     */
    private boolean canModify(Schedule entity, String operationPermission, String overridePermission) {
        if (!nuri.business.security.util.SecurityUtil.hasPermission(operationPermission)) {
            return false;
        }
        if (nuri.business.security.util.SecurityUtil.hasPermission(overridePermission)) {
            return true;
        }
        String owner = entity.getFrstRgtrId();
        return org.springframework.util.StringUtils.hasText(owner)
                && nuri.business.security.util.SecurityUtil.getCurrentLoginId().filter(owner::equals).isPresent();
    }
}
