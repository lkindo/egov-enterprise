package nuri.business.service.schedule;

import nuri.business.domain.schedule.Schedule;
import nuri.business.domain.schedule.ScheduleRepository;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.schedule.dto.ScheduleDto;
import nuri.business.service.schedule.dto.ScheduleMapper;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@DisplayName("ScheduleService 단위 테스트")
class ScheduleServiceTest {

    private org.mockito.MockedStatic<nuri.business.security.util.SecurityUtil> __secUtilMock;
    @org.junit.jupiter.api.BeforeEach
    void __openSecUtilMock() { __secUtilMock = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class); }
    @org.junit.jupiter.api.AfterEach
    void __closeSecUtilMock() { if (__secUtilMock != null) __secUtilMock.close(); }

    @Mock
    private ScheduleRepository scheduleRepository;

    @Mock
    private ScheduleMapper scheduleMapper;

    /** 담당자/부서 귀속을 서버가 정하면서 소속 조직 조회가 필요해졌다. 미스텁 시 Optional.empty() → 기본조직 폴백. */
    @Mock
    private nuri.business.domain.user.repository.UserRepository userRepository;

    @Mock
    private AttachmentAssignmentPolicy attachmentAssignmentPolicy;

    @InjectMocks
    private ScheduleService scheduleService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("일정 목록 조회")
    void getScheduleList() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        Schedule entity = Schedule.builder().schdlSn(1L).schdlNm("Test Schedule").build();
        given(scheduleRepository.searchSchedules(any(), any(), any(), any())).willReturn(new PageImpl<>(List.of(entity)));
        given(scheduleMapper.toDto(any())).willReturn(
                ScheduleDto.builder().schdlSn(1L).schdlNm("Test Schedule").build());

        // when
        Page<ScheduleDto> result = scheduleService.getScheduleList(null, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getSchdlNm()).isEqualTo("Test Schedule");
    }

    @Test
    @DisplayName("[DIP B4 P5] 등록자·전체 수정 권한자에게만 수정·삭제 힌트를 연다 — 같은 부서의 남의 일정은 닫힌다")
    void listCarriesEditHints() {
        Schedule mine = Schedule.builder().schdlSn(1L).schdlNm("내 일정").build();
        mine.setFrstRgtrId("user1");
        Schedule other = Schedule.builder().schdlSn(2L).schdlNm("남의 일정").build();
        other.setFrstRgtrId("user2");
        given(scheduleRepository.findMonthlySchedules(any(), any(), any())).willReturn(List.of(mine, other));
        given(scheduleMapper.toDto(any())).willAnswer(invocation -> ScheduleDto.builder()
                .schdlSn(((Schedule) invocation.getArgument(0)).getSchdlSn()).build());
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("SCHEDULE_UPDATE")).thenReturn(true);
        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("SCHEDULE_DELETE")).thenReturn(true);
        __secUtilMock.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId).thenReturn(Optional.of("user1"));

        List<ScheduleDto> result = scheduleService.getMonthlySchedule("user1", "202609");

        assertThat(result.get(0).getEditable()).isTrue();
        assertThat(result.get(0).getDeletable()).isTrue();
        assertThat(result.get(1).getEditable()).isFalse();
        assertThat(result.get(1).getDeletable()).isFalse();

        __secUtilMock.when(() -> nuri.business.security.util.SecurityUtil.hasPermission("SCHEDULE_UPDATE_ALL")).thenReturn(true);
        assertThat(scheduleService.getMonthlySchedule("user1", "202609").get(1).getEditable()).isTrue();
    }

    @Test
    @DisplayName("일정 상세 조회")
    void getSchedule() {
        // given
        Long schdlSn = 1L;
        Schedule entity = Schedule.builder().schdlSn(schdlSn).schdlNm("Test Schedule").build();
        given(scheduleRepository.findById(schdlSn)).willReturn(Optional.of(entity));
        given(scheduleMapper.toDto(any())).willReturn(
                ScheduleDto.builder().schdlSn(schdlSn).schdlNm("Test Schedule").build());

        // when
        ScheduleDto result = scheduleService.getSchedule(schdlSn);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getSchdlSn()).isEqualTo(schdlSn);
    }

    @Test
    @DisplayName("일정 생성 — PK·담당자·부서는 서버가 정하고 클라이언트 값은 무시한다")
    void createSchedule() {
        // given: 클라이언트가 PK 와 담당자, 부서를 위조해 보낸 상황
        String loginId = "user1";
        ScheduleDto dto = ScheduleDto.builder()
                .schdlSn(999L)
                .schdlPicId("attacker")
                .schdlDeptId("OTHER_DEPT")
                .schdlNm("New Schedule")
                .schdlSeCd("1")
                .schdlBgngYmd("20261020")
                .atchFileSn(101L)
                .build();
        given(userRepository.findByUserId(loginId)).willReturn(Optional.empty()); // 조직 미배정 → 기본조직 폴백
        given(scheduleRepository.save(any(Schedule.class)))
                .willReturn(Schedule.builder().schdlSn(2L).build());

        // when
        Long newSn = scheduleService.createSchedule(loginId, dto);

        // then
        org.mockito.ArgumentCaptor<Schedule> captor = org.mockito.ArgumentCaptor.forClass(Schedule.class);
        verify(scheduleRepository).save(captor.capture());
        Schedule saved = captor.getValue();

        // PK 는 DB 채번 대상으로 null 이며 클라이언트가 보낸 999를 쓰지 않는다.
        assertThat(saved.getSchdlSn()).isNull();
        assertThat(newSn).isEqualTo(2L);
        // 담당자는 인증 주체로 고정 (매스어사인먼트 차단)
        assertThat(saved.getSchdlPicId()).isEqualTo(loginId);
        // 부서도 서버가 결정 (미배정이므로 기본조직)
        assertThat(saved.getSchdlDeptId()).isEqualTo("ORGNZT_0000000000000");
        assertThat(saved.getAtchFileSn()).isEqualTo(101L);
        verify(attachmentAssignmentPolicy).assertAssignable(101L);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.NullAndEmptySource
    @org.junit.jupiter.params.provider.ValueSource(strings = {"20261021"})
    @DisplayName("등록·수정은 빈 종료일을 NULL로 저장하고 정상 종료일은 보존한다")
    void createAndUpdateNormalizeOnlyAbsentEndDate(String endDate) {
        ScheduleDto dto = ScheduleDto.builder().schdlNm("하루 일정").schdlBgngYmd("20261020")
                .schdlEndYmd(endDate).version(0).build();
        given(scheduleRepository.save(any(Schedule.class)))
                .willReturn(Schedule.builder().schdlSn(2L).build());

        scheduleService.createSchedule("user1", dto);

        var saved = org.mockito.ArgumentCaptor.forClass(Schedule.class);
        verify(scheduleRepository).save(saved.capture());
        String expectedEndDate = endDate == null || endDate.isEmpty() ? null : endDate;
        assertThat(saved.getValue().getSchdlEndYmd()).isEqualTo(expectedEndDate);
        assertThat(saved.getValue().getSchdlBgngYmd()).isEqualTo("20261020");
        assertThat(saved.getValue().getSchdlPicId()).isEqualTo("user1");

        Schedule existing = Schedule.builder().schdlSn(1L).schdlNm("기간 일정")
                .schdlBgngYmd("20261020").schdlEndYmd("20261025").schdlPicId("user1").build();
        org.springframework.test.util.ReflectionTestUtils.setField(existing, "version", 0);
        given(scheduleRepository.findById(1L)).willReturn(Optional.of(existing));

        scheduleService.updateSchedule(1L, "user1", dto);

        assertThat(existing.getSchdlEndYmd()).isEqualTo(expectedEndDate);
        assertThat(existing.getSchdlBgngYmd()).isEqualTo("20261020");
        assertThat(existing.getSchdlPicId()).isEqualTo("user1");
    }

    @Test
    @DisplayName("일정 생성 - 첨부 할당 거부 시 저장하지 않는다")
    void createSchedule_deniedAttachmentDoesNotSave() {
        ScheduleDto dto = ScheduleDto.builder()
                .schdlNm("New Schedule")
                .schdlBgngYmd("20261020")
                .atchFileSn(101L)
                .build();
        org.mockito.Mockito.doThrow(new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.ACCESS_DENIED))
                .when(attachmentAssignmentPolicy).assertAssignable(101L);

        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> scheduleService.createSchedule("user1", dto))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);

        verify(attachmentAssignmentPolicy).assertAssignable(101L);
        org.mockito.Mockito.verifyNoInteractions(scheduleRepository);
    }

    @Test
    @DisplayName("일정 수정")
    void updateSchedule() {
        // given
        Long schdlSn = 1L;
        String userId = "user1";
        Schedule existingEntity = Schedule.builder().schdlSn(schdlSn).schdlNm("Old Title").atchFileSn(100L).build();
        org.springframework.test.util.ReflectionTestUtils.setField(existingEntity, "version", 0);
        ScheduleDto updateDto = ScheduleDto.builder()
                .schdlSn(schdlSn)
                .schdlNm("New Title")
                .schdlBgngYmd("20261020")
                .atchFileSn(202L)
                .version(0)
                .build();

        given(scheduleRepository.findById(schdlSn)).willReturn(Optional.of(existingEntity));

        // when
        scheduleService.updateSchedule(schdlSn, userId, updateDto);

        // then
        assertThat(existingEntity.getSchdlNm()).isEqualTo("New Title");
        assertThat(existingEntity.getAtchFileSn()).isEqualTo(202L);
        verify(attachmentAssignmentPolicy).assertAssignable(202L);
    }

    @Test
    @DisplayName("[2026-10-18] 일정 수정 — 읽은 버전이 다르면 409, 버전이 없으면 400 이고 일정을 바꾸지 않는다")
    void updateSchedule_rejectsStaleOrMissingVersion() {
        Schedule existing = Schedule.builder().schdlSn(1L).schdlNm("최신 일정").build();
        org.springframework.test.util.ReflectionTestUtils.setField(existing, "version", 8);
        given(scheduleRepository.findById(1L)).willReturn(Optional.of(existing));

        // 소유권 가드(SecurityUtil)는 이 클래스의 @BeforeEach 정적 목이 통과시킨다 — 버전 대조만 본다.
        assertThatThrownBy(() -> scheduleService.updateSchedule(1L, "user1",
                ScheduleDto.builder().schdlNm("옛 화면").schdlBgngYmd("20261001").version(7).build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThatThrownBy(() -> scheduleService.updateSchedule(1L, "user1",
                ScheduleDto.builder().schdlNm("버전 없음").schdlBgngYmd("20261001").build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);

        assertThat(existing.getSchdlNm()).isEqualTo("최신 일정");
        org.mockito.Mockito.verifyNoInteractions(attachmentAssignmentPolicy);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.NullAndEmptySource
    @org.junit.jupiter.params.provider.ValueSource(strings = {"  "})
    @DisplayName("[2026-10-18] 일정 등록·수정 — 시작일이 없으면 400 이고 저장·변경하지 않는다(시작일 없는 일정은 달력에 나타나지 않았다)")
    void createAndUpdateRequireStartDate(String startDate) {
        assertThatThrownBy(() -> scheduleService.createSchedule("user1",
                ScheduleDto.builder().schdlNm("시작일 없음").schdlBgngYmd(startDate).build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("시작일")
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        org.mockito.Mockito.verify(scheduleRepository, org.mockito.Mockito.never()).save(any());

        Schedule existing = Schedule.builder().schdlSn(1L).schdlNm("원래").schdlBgngYmd("20261001").build();
        org.springframework.test.util.ReflectionTestUtils.setField(existing, "version", 0);
        given(scheduleRepository.findById(1L)).willReturn(Optional.of(existing));
        assertThatThrownBy(() -> scheduleService.updateSchedule(1L, "user1",
                ScheduleDto.builder().schdlNm("시작일 지움").schdlBgngYmd(startDate).version(0).build()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(existing.getSchdlBgngYmd()).isEqualTo("20261001");
        assertThat(existing.getSchdlNm()).isEqualTo("원래");
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"", "2026-10", "202613", "202600", "2026101", "000010", "20261"})
    @DisplayName("[2026-10-18] 월별 조회는 yyyyMM 이 아니면 400 이고 질의하지 않는다 — 종전에는 빈 목록이나 다른 달을 돌려줬다")
    void monthlyScheduleRejectsMalformedYearMonth(String yearMonth) {
        assertThatThrownBy(() -> scheduleService.getMonthlySchedule("user1", yearMonth))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThatThrownBy(() -> scheduleService.getMonthlySchedule("user1", null))
                .isInstanceOf(BusinessException.class);
        org.mockito.Mockito.verifyNoInteractions(scheduleRepository);
    }

    @Test
    @DisplayName("일정 삭제")
    void deleteSchedule() {
        // given
        Long schdlSn = 1L;
        String userId = "user1";
        Schedule entity = Schedule.builder().schdlSn(schdlSn).build();
        entity.setFrstRgtrId(userId); // 감사 필드는 빌더 대신 세터로 세팅(테스트 시나리오 구성용)
        given(scheduleRepository.findById(schdlSn)).willReturn(Optional.of(entity));

        // when
        scheduleService.deleteSchedule(schdlSn, userId);

        // then
        verify(scheduleRepository).delete(entity);
    }

    @Test
    @DisplayName("일정 삭제 - 소유권 가드(SecurityUtil.assertOwnerOrPermission) 위임 검증")
    void deleteSchedule_delegatesOwnershipGuard() {
        // given — 소유자 loginId=frstRgtrId. 실제 소유권 거부/허용 판정은 SecurityUtilTest 가 검증하고,
        // 여기서는 서비스가 엔티티의 frstRgtrId 로 가드를 '호출'하는지(배선)를 확인한다.
        Long schdlSn = 1L;
        Schedule entity = Schedule.builder().schdlSn(schdlSn).build();
        entity.setFrstRgtrId("creator");
        given(scheduleRepository.findById(schdlSn)).willReturn(Optional.of(entity));

        // when
        scheduleService.deleteSchedule(schdlSn, "otherUser");

        // then — 가드가 소유자 loginId 로 호출됨
        __secUtilMock.verify(() -> nuri.business.security.util.SecurityUtil.assertOwnerOrPermission("creator", "SCHEDULE_DELETE_ALL"));
    }

    @Test
    @org.junit.jupiter.api.DisplayName("🔐 부서 공유로 바꾸면 소유자의 현재 부서에 공유한다 — 대행 수정자의 부서로 옮기지 않는다")
    void updateSchedule_sharesWithTheOwnersDepartment() {
        Schedule entity = Schedule.builder().schdlSn(1L).schdlNm("일정").schdlSeCd("2").schdlDeptId("OLD_DEPT").build();
        org.springframework.test.util.ReflectionTestUtils.setField(entity, "version", 0);
        org.springframework.test.util.ReflectionTestUtils.setField(entity, "frstRgtrId", "owner");
        nuri.business.domain.user.entity.User owner = org.mockito.Mockito.mock(nuri.business.domain.user.entity.User.class);
        given(owner.getOgnzId()).willReturn("OWNER_DEPT");
        given(userRepository.findByUserId("owner")).willReturn(Optional.of(owner));
        given(scheduleRepository.findById(1L)).willReturn(Optional.of(entity));

        scheduleService.updateSchedule(1L, "delegate-admin",
                ScheduleDto.builder().schdlSn(1L).schdlNm("일정").schdlSeCd("1").schdlBgngYmd("20261020").version(0).build());

        assertThat(entity.getSchdlDeptId()).isEqualTo("OWNER_DEPT");
    }

    @Test
    @org.junit.jupiter.api.DisplayName("🔐 이미 부서 공유인 일정을 고쳐도 공유 부서는 그대로다 — 제목만 고친 대행 수정이 다른 부서로 옮기지 않는다")
    void updateSchedule_keepsTheSharedDepartmentOnPlainEdits() {
        Schedule entity = Schedule.builder().schdlSn(1L).schdlNm("일정").schdlSeCd("1").schdlDeptId("ORIGINAL_DEPT").build();
        org.springframework.test.util.ReflectionTestUtils.setField(entity, "version", 0);
        given(scheduleRepository.findById(1L)).willReturn(Optional.of(entity));

        scheduleService.updateSchedule(1L, "delegate-admin",
                ScheduleDto.builder().schdlSn(1L).schdlNm("새 제목").schdlSeCd("1").schdlBgngYmd("20261020").version(0).build());

        assertThat(entity.getSchdlDeptId()).isEqualTo("ORIGINAL_DEPT");
    }
}
