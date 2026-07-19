package nuri.business.service.schedule;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.schedule.Schedule;
import nuri.business.domain.schedule.ScheduleRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.schedule.dto.ScheduleDto;
import nuri.business.service.schedule.dto.ScheduleMapper;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.util.IdGenerationUtil;
import nuri.business.core.service.BaseAbstractService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScheduleService extends BaseAbstractService {

    private final ScheduleRepository scheduleRepository;
    private final ScheduleMapper scheduleMapper;
    private final UserRepository userRepository;

    /**
     * 소속 조직 미배정(ognz_id = null) 사용자의 폴백 조직. tb_ognz_info 의 '기본조직' 이다.
     * 현재 사용자 전원이 미배정 상태라 폴백이 사실상의 기본 부서로 동작하며,
     * 추후 사용자에게 실제 부서를 배정하면 자연히 부서별로 분리된다.
     */
    private static final String DEFAULT_ORG_ID = "ORGNZT_0000000000000";

    /** 로그인 사용자의 소속 조직 ID. 미배정이면 기본조직으로 폴백한다. */
    private String resolveDeptId(String loginId) {
        if (loginId == null || loginId.isBlank()) {
            return DEFAULT_ORG_ID;
        }
        return userRepository.findByUserId(loginId)
                .map(User::getOgnzId)
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
        return scheduleRepository.findMonthlySchedules(userId, resolveDeptId(userId), yearMonth).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
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

    public ScheduleDto getSchedule(@NonNull String schdlId) {
        Schedule entity = scheduleRepository.findById(schdlId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 소유자/관리자만 조회
        return convertToDto(entity);
    }

    @Transactional
    public String createSchedule(String userId, ScheduleDto dto) {
        // [PK 채번] Schedule 은 @GeneratedValue 없는 할당식 PK(varchar 20)다. 클라이언트가 보낸 schdlId 를
        //   그대로 쓰면 미전송 시 null PK 로 persist 되어 저장 자체가 실패한다(등록 UI 는 이 필드를 보내지 않는다).
        //   저장소의 다른 create 경로와 동일하게 서버가 채번한다(ScrapService 선례). 'SCHDL_'(6) + 14 = 20자.
        String schdlId = IdGenerationUtil.generateUniqueId("SCHDL_", 14, scheduleRepository::existsById);

        // [소유자 고정] 조회 4종(searchSchedules/findMonthlySchedules/findSchedulesByDateRange)이 모두
        //   s.schdlPicId = :loginId 로 필터한다. 담당자를 클라이언트 DTO 값으로 두면
        //   ① 미전송 시 null 이 되어 등록해도 어떤 목록에도 나타나지 않고(저장축↔조회축 단절),
        //   ② 타인의 loginId 를 실어 보내 남의 일정으로 위조할 수 있다(매스어사인먼트).
        //   그래서 인증 주체(loginId)로 고정한다 — BE 헌법 제8조 2항(소유 컬럼이 실제 저장하는 축과 일치),
        //   BoardService.createPost 의 저자 위조 차단과 동일한 패턴.
        Schedule entity = Schedule.builder()
                .schdlId(schdlId)
                .schdlSeCd(dto.getSchdlSeCd())
                // [부서 귀속] 소속 조직은 서버가 정한다. 클라이언트 값을 신뢰하면 남의 부서 일정으로
                //   끼워 넣을 수 있고, 미전송 시 null 이 되어 부서 목록에서 사라진다.
                .schdlDeptId(resolveDeptId(userId))
                .schdlKndCd(dto.getSchdlKndCd())
                .schdlNm(dto.getSchdlNm())
                .schdlCn(dto.getSchdlCn())
                .schdlBgngYmd(dto.getSchdlBgngYmd())
                .schdlEndYmd(dto.getSchdlEndYmd())
                .schdlPlcNm(dto.getSchdlPlcNm())
                .schdlImprtCd(dto.getSchdlImprtCd())
                .schdlPicId(userId)
                .schdlIpAddr(dto.getSchdlIpAddr())
                .reptSeCd(dto.getReptSeCd())
                .atchFileId(dto.getAtchFileId())
                .build();
        // frstRgtrId 는 표준 Auditing(@CreatedBy)이 설정하므로 빌더에서 제외
        scheduleRepository.save(entity);
        return entity.getSchdlId();
    }

    @Transactional
    public void updateSchedule(String id, String userId, ScheduleDto dto) {
        Schedule entity = scheduleRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId()); // [IDOR] 소유자/관리자만 수정

        entity.updateAll(
                dto.getSchdlNm(),
                dto.getSchdlCn(),
                dto.getSchdlSeCd(),
                dto.getSchdlKndCd(),
                dto.getSchdlBgngYmd(),
                dto.getSchdlEndYmd(),
                dto.getSchdlPlcNm(),
                dto.getSchdlImprtCd(),
                // [소유자 불변] 담당자는 등록 시 인증 주체로 고정되며 수정으로 재지정하지 않는다.
                //   DTO 값을 그대로 넘기면 ① null 전송 시 담당자가 지워져 목록(schdlPicId 필터)에서 사라지고
                //   ② 타인 loginId 로 바꿔 남의 일정으로 넘길 수 있다. create 만 막으면 이 경로로 우회된다.
                entity.getSchdlPicId(),
                dto.getReptSeCd());
        
        entity.setLastMdfrId(userId);
    }

    @Transactional
    public void deleteSchedule(@NonNull String schdlId, String userId) {
        Schedule entity = scheduleRepository.findById(schdlId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // [IDOR/정체성 수정] 기존 가드는 userId(컨트롤러 esntlId)와 frstRgtrId(loginId)를 비교해 항상 deny-all 이었다.
        // SecurityUtil 이 SecurityContext 에서 loginId 를 읽어 소유자/관리자를 올바로 판정한다.
        nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(entity.getFrstRgtrId());

        scheduleRepository.delete(entity);
    }

    public List<java.util.Map<String, Object>> selectEmpLyrPopup(@NonNull nuri.business.domain.common.BaseSearchDto searchVO) {
        return java.util.Collections.emptyList();
    }

    private ScheduleDto convertToDto(Schedule entity) {
        return scheduleMapper.toDto(entity);
    }
}
