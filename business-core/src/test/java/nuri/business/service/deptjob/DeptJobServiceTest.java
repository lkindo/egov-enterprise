package nuri.business.service.deptjob;

import com.querydsl.core.types.Predicate;
import nuri.business.domain.deptjob.DeptJob;
import nuri.business.domain.deptjob.DeptJobBox;
import nuri.business.domain.deptjob.DeptJobBoxRepository;
import nuri.business.domain.deptjob.DeptJobRepository;
import nuri.business.domain.organization.OrganizationManage;
import nuri.business.domain.organization.OrganizationManageRepository;
import nuri.business.service.deptjob.dto.DeptJobDto;
import nuri.business.service.deptjob.dto.DeptJobMapper;
import nuri.business.service.deptjob.dto.DeptJobMapperImpl;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DeptJobService 단위 테스트")
class DeptJobServiceTest {

    @Mock
    private DeptJobRepository deptJobRepository;

    @Mock
    private DeptJobBoxRepository deptJobBoxRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private OrganizationManageRepository organizationManageRepository;

    // 실제 MapStruct 생성 구현(DeptJobMapperImpl)을 spy 로 주입 — 수기 from() 과 동일 매핑 거동 보장
    @Spy
    private DeptJobMapper deptJobMapper = new DeptJobMapperImpl();

    @InjectMocks
    private DeptJobService deptJobService;

    private DeptJob deptJob;
    private DeptJobBox deptJobBox;

    @BeforeEach
    void setUp() {
        deptJobBox = DeptJobBox.builder()
                .deptTaskBoxSn(1L)
                .deptTaskBoxNm("Test Box")
                .deptId("DEPT1")
                .build();

        deptJob = DeptJob.builder()
                .deptTaskSn(1L)
                .deptTaskBoxSn(1L)
                .deptTaskNm("Test Job")
                .deptTaskCn("Content")
                .picId("USER1")
                .prrtyRnk("1")
                .atchFileId("FILE1")
                .build();
    }

    private void mockToDtoDependencies() {
        when(deptJobBoxRepository.findById(1L)).thenReturn(Optional.of(deptJobBox));
        
        OrganizationManage org = OrganizationManage.builder()
                .ognzId("DEPT1")
                .ognzNm("Test Dept")
                .build();
        when(organizationManageRepository.findById("DEPT1")).thenReturn(Optional.of(org));

        User user = User.builder()
                .userId("TEST")
                .pswd("TEST")
                .esntlId("USER1")
                .userNm("Test User")
                .build();
        when(userRepository.findByEsntlId("USER1")).thenReturn(Optional.of(user));
    }

    @Test
    @DisplayName("부서업무 목록 조회 - boxId 있음, 조건 0")
    void getDeptJobList_withBoxIdAndCondition0() {
        Page<DeptJob> page = new PageImpl<>(Collections.singletonList(deptJob), PageRequest.of(0, 10), 1);
        when(deptJobRepository.findAll(any(Predicate.class), any(PageRequest.class))).thenReturn(page);
        mockToDtoDependencies();

        Page<DeptJobDto> result = deptJobService.getDeptJobList(null, 1L, "0", "keyword", false, PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
    }

    @Test
    @DisplayName("부서업무 목록 조회 - deptId 있고 박스 있음, 조건 1")
    void getDeptJobList_withDeptIdWithBoxesAndCondition1() {
        when(deptJobBoxRepository.findByDeptId("DEPT1")).thenReturn(Collections.singletonList(deptJobBox));
        Page<DeptJob> page = new PageImpl<>(Collections.singletonList(deptJob), PageRequest.of(0, 10), 1);
        when(deptJobRepository.findAll(any(Predicate.class), any(PageRequest.class))).thenReturn(page);
        mockToDtoDependencies();

        Page<DeptJobDto> result = deptJobService.getDeptJobList("DEPT1", null, "1", "keyword", false, PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
    }

    @Test
    @DisplayName("부서업무 목록 조회 - deptId 있지만 박스 없음, 조건 2")
    void getDeptJobList_withDeptIdNoBoxesAndCondition2() {
        when(deptJobBoxRepository.findByDeptId("DEPT2")).thenReturn(Collections.emptyList());
        Page<DeptJobDto> result = deptJobService.getDeptJobList("DEPT2", null, "2", "keyword", false, PageRequest.of(0, 10));

        assertEquals(0, result.getTotalElements());
        verify(deptJobRepository, never()).findAll(any(Predicate.class), any(PageRequest.class));
    }

    @Test
    @DisplayName("[보안] '내 업무만' 조회는 신원을 확정할 수 없으면 전체로 승격되지 않고 빈 결과가 된다")
    void getDeptJobList_mineOnly_failsClosedWithoutIdentity() {
        // 조건을 붙이지 못했을 때 그냥 통과시키면 '내 업무만' 요청이 조용히 전체 목록이 되어
        // 소유 스코프가 이름만 남는다. fail-closed 여야 한다.
        try (var mocked = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            Page<DeptJobDto> result = deptJobService.getDeptJobList(
                    null, null, "0", null, true, PageRequest.of(0, 10));

            assertEquals(0, result.getTotalElements());
        }
        verify(deptJobRepository, never()).findAll(any(Predicate.class), any(PageRequest.class));
    }

    @Test
    @DisplayName("부서업무 상세 조회")
    void getDeptJob() {
        when(deptJobRepository.findById(1L)).thenReturn(Optional.of(deptJob));
        mockToDtoDependencies();

        DeptJobDto result = deptJobService.getDeptJob(1L);

        assertNotNull(result);
        assertEquals(1L, result.getDeptTaskSn());
        assertEquals("Test Dept", result.getDeptNm());
        assertEquals("Test User", result.getPicNm());
    }

    @Test
    @DisplayName("부서업무 상세 조회 실패 - 존재하지 않음")
    void getDeptJob_NotFound() {
        when(deptJobRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> deptJobService.getDeptJob(99L));
    }

    @Test
    @DisplayName("부서업무 생성 - PK 는 DB가 채번하고 클라이언트 값은 무시한다")
    void createDeptJob() {
        DeptJobDto dto = new DeptJobDto();
        dto.setDeptTaskSn(999L); // 위조 시도: 신규 엔티티 생성에는 사용하지 않는다
        dto.setDeptTaskBoxSn(1L);
        dto.setDeptTaskNm("Test Job");

        DeptJob persisted = DeptJob.builder().deptTaskSn(2L).deptTaskNm("Test Job").build();
        when(deptJobRepository.save(any(DeptJob.class))).thenReturn(persisted);

        Long result = deptJobService.createDeptJob("USR_TESTER", dto);

        ArgumentCaptor<DeptJob> captor = ArgumentCaptor.forClass(DeptJob.class);
        verify(deptJobRepository, times(1)).save(captor.capture());
        DeptJob saved = captor.getValue();

        assertNull(saved.getDeptTaskSn(), "INSERT 전 PK는 DB identity가 채우도록 비워야 한다");
        assertEquals(2L, result, "반환값은 DB가 생성한 PK 여야 한다");
    }

    @Test
    @DisplayName("부서업무 생성 - 담당자 미지정 시 등록자를 담당자로 둔다")
    void createDeptJob_defaultsPicToCreator() {
        DeptJobDto dto = new DeptJobDto();
        dto.setDeptTaskNm("담당자 미지정 업무");

        when(deptJobRepository.save(any(DeptJob.class))).thenAnswer(inv -> inv.getArgument(0));

        deptJobService.createDeptJob("USR_TESTER", dto);

        ArgumentCaptor<DeptJob> captor = ArgumentCaptor.forClass(DeptJob.class);
        verify(deptJobRepository).save(captor.capture());
        assertEquals("USR_TESTER", captor.getValue().getPicId());
    }

    @Test
    @DisplayName("부서업무 생성 - 담당자를 지정하면 그 값을 유지한다")
    void createDeptJob_keepsExplicitPic() {
        DeptJobDto dto = new DeptJobDto();
        dto.setDeptTaskNm("담당자 지정 업무");
        dto.setPicId("USR_OTHER");

        when(deptJobRepository.save(any(DeptJob.class))).thenAnswer(inv -> inv.getArgument(0));

        deptJobService.createDeptJob("USR_TESTER", dto);

        ArgumentCaptor<DeptJob> captor = ArgumentCaptor.forClass(DeptJob.class);
        verify(deptJobRepository).save(captor.capture());
        assertEquals("USR_OTHER", captor.getValue().getPicId());
    }

    @Test
    @DisplayName("부서업무 수정")
    void updateDeptJob() {
        when(deptJobRepository.findById(1L)).thenReturn(Optional.of(deptJob));
        
        DeptJobDto dto = new DeptJobDto();
        dto.setDeptTaskNm("Updated Job");

        // 소유권 가드는 담당자(pic_id=esntlId) 기준이다. SecurityContext 가 없는 단위 테스트에서는
        // getCurrentEsntlId() 를 담당자 본인으로 세워 통과 경로를 재현한다.
        try (var mocked = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                    .thenReturn(Optional.of("USER1"));
            deptJobService.updateDeptJob(1L, dto);
        }

        assertEquals("Updated Job", deptJob.getDeptTaskNm());
    }

    @Test
    @DisplayName("부서업무 수정 - 담당자도 관리자도 아니면 403")
    void updateDeptJob_deniedForNonPic() {
        when(deptJobRepository.findById(1L)).thenReturn(Optional.of(deptJob)); // picId = USER1

        DeptJobDto dto = new DeptJobDto();
        dto.setDeptTaskNm("남의 업무 수정 시도");

        try (var mocked = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                    .thenReturn(Optional.of("USER_INTRUDER"));

            assertThrows(BusinessException.class, () -> deptJobService.updateDeptJob(1L, dto));
        }

        assertEquals("Test Job", deptJob.getDeptTaskNm(), "인가 실패 시 값이 바뀌면 안 된다");
    }

    @Test
    @DisplayName("[회귀] 담당자가 비어 있는 업무는 등록자 기준으로 판정한다")
    void updateDeptJob_fallsBackToRegistrantWhenPicIsNull() {
        // pic_id 는 nullable 이다. 담당자 검사만 걸면 담당자 공석 행은 관리자 외 아무도 손댈 수 없는
        // 고아 데이터가 된다. 등록자 폴백이 그 경로를 살려 두는지 확인한다.
        DeptJob noPic = DeptJob.builder()
                .deptTaskSn(2L)
                .deptTaskNm("담당자 없는 업무")
                .build();
        when(deptJobRepository.findById(2L)).thenReturn(Optional.of(noPic));

        DeptJobDto dto = new DeptJobDto();
        dto.setDeptTaskNm("등록자가 수정");

        // 등록자 폴백은 loginId 축 가드(assertOwnerOrAdmin)에 위임된다. 그 가드의 판정 로직 자체는
        // SecurityUtilTest 가 검증하므로 여기서는 통과로 둔다.
        // 이 통과 자체가 축(axis) 검증이다 — 서비스가 esntlId 축 가드를 탔다면 getCurrentEsntlId() 가
        // 비어 있어 ACCESS_DENIED 로 떨어지므로 아래 assertDoesNotThrow 가 실패한다.
        try (var mocked = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mocked.when(() -> nuri.business.security.util.SecurityUtil.assertOwnerOrAdmin(any()))
                    .thenAnswer(invocation -> null);

            assertDoesNotThrow(() -> deptJobService.updateDeptJob(2L, dto));
        }

        assertEquals("등록자가 수정", noPic.getDeptTaskNm());
    }

    @Test
    @DisplayName("[회귀] 수정 시 담당자를 보내지 않으면 기존 담당자를 유지한다")
    void updateDeptJob_keepsExistingPicWhenOmitted() {
        // update() 는 전달값을 그대로 덮어쓴다. 담당자 필드를 보내지 않는 폼이 저장하면
        // pic_id 가 null 로 지워져 담당자 본인이 되레 수정 권한을 잃는다.
        when(deptJobRepository.findById(1L)).thenReturn(Optional.of(deptJob));

        DeptJobDto dto = new DeptJobDto();
        dto.setDeptTaskNm("담당자 미전송 수정");

        try (var mocked = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                    .thenReturn(Optional.of("USER1"));
            deptJobService.updateDeptJob(1L, dto);
        }

        assertEquals("USER1", deptJob.getPicId(), "담당자를 보내지 않았다고 소유권이 지워지면 안 된다");
    }

    @Test
    @DisplayName("부서업무 삭제")
    void deleteDeptJob() {
        // 종전에는 deleteById 로 존재 확인도 소유권 검증도 없이 지웠다.
        when(deptJobRepository.findById(1L)).thenReturn(Optional.of(deptJob));

        try (var mocked = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                    .thenReturn(Optional.of("USER1")); // 담당자 본인
            deptJobService.deleteDeptJob(1L);
        }

        verify(deptJobRepository, times(1)).delete(deptJob);
    }

    @Test
    @DisplayName("부서업무 삭제 - 담당자도 관리자도 아니면 403")
    void deleteDeptJob_deniedForNonPic() {
        when(deptJobRepository.findById(1L)).thenReturn(Optional.of(deptJob)); // picId = USER1

        try (var mocked = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId)
                    .thenReturn(Optional.of("USER_INTRUDER"));

            assertThrows(BusinessException.class, () -> deptJobService.deleteDeptJob(1L));
        }

        verify(deptJobRepository, never()).delete(any(DeptJob.class));
    }

    @Test
    @DisplayName("부서업무 삭제 - 존재하지 않으면 404")
    void deleteDeptJob_NotFound() {
        when(deptJobRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> deptJobService.deleteDeptJob(99L));
        verify(deptJobRepository, never()).delete(any(DeptJob.class));
    }

    @Test
    @DisplayName("[회귀] 업무함 미지정(null) 업무도 조회할 수 있다")
    void getDeptJob_withoutBox() {
        // 종전에는 toDto 가 nullable 컬럼(dept_task_box_sn, pic_id)에 required() 가드를 걸어,
        // 업무함을 지정하지 않은 업무가 하나라도 있으면 조회가 통째로 400 으로 떨어졌다.
        // 등록 폼에 업무함 선택 UI 가 없으므로 새 업무는 항상 이 상태다 —
        // 즉 데이터가 생기는 순간 조회가 깨지는 구조였다.
        DeptJob noBox = DeptJob.builder()
                .deptTaskSn(3L)
                .deptTaskNm("업무함 없는 업무")
                .build();
        when(deptJobRepository.findById(3L)).thenReturn(Optional.of(noBox));

        DeptJobDto dto = assertDoesNotThrow(() -> deptJobService.getDeptJob(3L));

        assertEquals(3L, dto.getDeptTaskSn());
        assertNull(dto.getDeptTaskBoxNm());
        assertNull(dto.getPicNm());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강] PIT 이 DeptJobService 에서 13개를 살려 보냈다.
    //   그중 7개가 getDeptJobList 의 조건 분기다.
    //
    //   ⚠ 왜 기존 테스트가 못 잡았나: 위 테스트들은 `any(Predicate.class)` 로 받고
    //   결과 건수만 본다. 그러면 서비스가 **어떤 조건을 만들었든** 목이 같은 Page 를
    //   돌려주므로 분기를 뒤집어도 통과한다.
    //   조건 생성을 검증하려면 **Predicate 를 캡처해 그 내용을 확인**해야 한다.
    // ─────────────────────────────────────────────────────────────────────────

    /** 서비스가 저장소에 넘긴 Predicate 를 문자열로 붙잡는다 — 조건 생성의 유일한 관측 지점이다. */
    private String capturePredicate(String deptId, Long boxSn, String cond, String keyword) {
        Page<DeptJob> page = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0);
        when(deptJobRepository.findAll(any(Predicate.class), any(PageRequest.class))).thenReturn(page);
        deptJobService.getDeptJobList(deptId, boxSn, cond, keyword, false, PageRequest.of(0, 10));
        ArgumentCaptor<Predicate> captor = ArgumentCaptor.forClass(Predicate.class);
        verify(deptJobRepository).findAll(captor.capture(), any(PageRequest.class));
        return String.valueOf(captor.getValue());
    }

    @Test
    @DisplayName("검색조건 0 은 부서업무명에만 건다 (내용·담당자 아님)")
    void searchCondition0BindsTaskNameOnly() {
        String p = capturePredicate(null, 1L, "0", "KW");
        assertTrue(p.contains("deptTaskNm"), "조건 0 은 deptTaskNm 에 걸려야 한다: " + p);
        assertFalse(p.contains("deptTaskCn"), "조건 0 인데 내용에 걸렸다: " + p);
        assertFalse(p.contains("picId"), "조건 0 인데 담당자에 걸렸다: " + p);
    }

    @Test
    @DisplayName("검색조건 1 은 부서업무내용에만 건다")
    void searchCondition1BindsTaskContentOnly() {
        String p = capturePredicate(null, 1L, "1", "KW");
        assertTrue(p.contains("deptTaskCn"), "조건 1 은 deptTaskCn 에 걸려야 한다: " + p);
        assertFalse(p.contains("deptTaskNm"), "조건 1 인데 업무명에 걸렸다: " + p);
    }

    @Test
    @DisplayName("검색조건 2 는 담당자ID 에만 건다")
    void searchCondition2BindsPicIdOnly() {
        String p = capturePredicate(null, 1L, "2", "KW");
        assertTrue(p.contains("picId"), "조건 2 는 picId 에 걸려야 한다: " + p);
        assertFalse(p.contains("deptTaskNm"), "조건 2 인데 업무명에 걸렸다: " + p);
    }

    @Test
    @DisplayName("키워드가 비면 어떤 검색조건도 걸지 않는다")
    void blankKeywordAddsNoSearchPredicate() {
        String p = capturePredicate(null, 1L, "0", "");
        assertFalse(p.contains("deptTaskNm"), "빈 키워드인데 조건이 붙었다: " + p);
    }

    @Test
    @DisplayName("boxId 가 있으면 deptId 조회는 하지 않는다 (else-if 우선순위)")
    void boxIdTakesPrecedenceOverDeptId() {
        String p = capturePredicate("DEPT1", 1L, null, null);
        assertTrue(p.contains("1"), "boxSn 조건이 걸려야 한다: " + p);
        // else-if 를 if 로 바꾼 뮤턴트는 여기서 죽는다 — deptId 분기가 함께 실행되면 조회가 발생한다.
        verify(deptJobBoxRepository, never()).findByDeptId(anyString());
    }

    @Test
    @DisplayName("deptId 의 박스가 비면 빈 페이지로 닫는다 — 전체 노출을 막는 안전장치")
    void emptyBoxListReturnsEmptyPage() {
        when(deptJobBoxRepository.findByDeptId("DEPT2")).thenReturn(Collections.emptyList());
        Page<DeptJobDto> result = deptJobService.getDeptJobList(
                "DEPT2", null, null, null, false, PageRequest.of(0, 10));

        assertTrue(result.isEmpty(), "박스 0건이면 빈 페이지로 닫아야 한다");
        verify(deptJobRepository, never()).findAll(any(Predicate.class), any(PageRequest.class));
    }
}
