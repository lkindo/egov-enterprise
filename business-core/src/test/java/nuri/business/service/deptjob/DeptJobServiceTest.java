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
                .deptTaskBoxId("BOX1")
                .deptTaskBoxNm("Test Box")
                .deptId("DEPT1")
                .build();

        deptJob = DeptJob.builder()
                .deptTaskId("JOB1")
                .deptTaskBoxId("BOX1")
                .deptTaskNm("Test Job")
                .deptTaskCn("Content")
                .picId("USER1")
                .prrtyRnk("1")
                .atchFileId("FILE1")
                .build();
    }

    private void mockToDtoDependencies() {
        when(deptJobBoxRepository.findById("BOX1")).thenReturn(Optional.of(deptJobBox));
        
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

        Page<DeptJobDto> result = deptJobService.getDeptJobList(null, "BOX1", "0", "keyword", PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
    }

    @Test
    @DisplayName("부서업무 목록 조회 - deptId 있고 박스 있음, 조건 1")
    void getDeptJobList_withDeptIdWithBoxesAndCondition1() {
        when(deptJobBoxRepository.findByDeptId("DEPT1")).thenReturn(Collections.singletonList(deptJobBox));
        Page<DeptJob> page = new PageImpl<>(Collections.singletonList(deptJob), PageRequest.of(0, 10), 1);
        when(deptJobRepository.findAll(any(Predicate.class), any(PageRequest.class))).thenReturn(page);
        mockToDtoDependencies();

        Page<DeptJobDto> result = deptJobService.getDeptJobList("DEPT1", null, "1", "keyword", PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
    }

    @Test
    @DisplayName("부서업무 목록 조회 - deptId 있지만 박스 없음, 조건 2")
    void getDeptJobList_withDeptIdNoBoxesAndCondition2() {
        when(deptJobBoxRepository.findByDeptId("DEPT2")).thenReturn(Collections.emptyList());
        Page<DeptJob> page = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0);
        when(deptJobRepository.findAll(any(Predicate.class), any(PageRequest.class))).thenReturn(page);

        Page<DeptJobDto> result = deptJobService.getDeptJobList("DEPT2", null, "2", "keyword", PageRequest.of(0, 10));

        assertEquals(0, result.getTotalElements());
    }

    @Test
    @DisplayName("부서업무 상세 조회")
    void getDeptJob() {
        when(deptJobRepository.findById("JOB1")).thenReturn(Optional.of(deptJob));
        mockToDtoDependencies();

        DeptJobDto result = deptJobService.getDeptJob("JOB1");

        assertNotNull(result);
        assertEquals("JOB1", result.getDeptTaskId());
        assertEquals("Test Dept", result.getDeptNm());
        assertEquals("Test User", result.getPicNm());
    }

    @Test
    @DisplayName("부서업무 상세 조회 실패 - 존재하지 않음")
    void getDeptJob_NotFound() {
        when(deptJobRepository.findById("JOB99")).thenReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> deptJobService.getDeptJob("JOB99"));
    }

    @Test
    @DisplayName("부서업무 생성 - PK 는 서버가 채번하고 클라이언트 값은 무시한다")
    void createDeptJob() {
        // [회귀] 종전 구현은 dto.getDeptTaskId() 를 PK 로 썼다. 등록 폼은 이 값을 보내지 않으므로
        //   실제로는 null PK 로 persist 되어 저장이 불가능했다(dept_task_id 는 NOT NULL).
        //   그런데 옛 테스트는 dto 에 PK 를 넣어주고 assertNotNull 만 확인해 통과했다 —
        //   테스트가 잘못된 것을 단언하고 있었다. 이제 채번 주체를 직접 검증한다.
        DeptJobDto dto = new DeptJobDto();
        dto.setDeptTaskId("CLIENT_SUPPLIED"); // 위조 시도: 무시되어야 한다
        dto.setDeptTaskBoxId("BOX1");
        dto.setDeptTaskNm("Test Job");

        when(deptJobRepository.existsById(anyString())).thenReturn(false);
        when(deptJobRepository.save(any(DeptJob.class))).thenAnswer(inv -> inv.getArgument(0));

        String result = deptJobService.createDeptJob("USR_TESTER", dto);

        ArgumentCaptor<DeptJob> captor = ArgumentCaptor.forClass(DeptJob.class);
        verify(deptJobRepository, times(1)).save(captor.capture());
        DeptJob saved = captor.getValue();

        assertNotNull(saved.getDeptTaskId());
        assertNotEquals("CLIENT_SUPPLIED", saved.getDeptTaskId(), "클라이언트가 보낸 PK 를 그대로 쓰면 안 된다");
        assertTrue(saved.getDeptTaskId().startsWith("TASK_"));
        assertTrue(saved.getDeptTaskId().length() <= 20, "dept_task_id 컬럼 상한 20자");
        assertEquals(saved.getDeptTaskId(), result, "반환값은 실제 저장된 PK 여야 한다");
    }

    @Test
    @DisplayName("부서업무 생성 - 담당자 미지정 시 등록자를 담당자로 둔다")
    void createDeptJob_defaultsPicToCreator() {
        DeptJobDto dto = new DeptJobDto();
        dto.setDeptTaskNm("담당자 미지정 업무");

        when(deptJobRepository.existsById(anyString())).thenReturn(false);
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

        when(deptJobRepository.existsById(anyString())).thenReturn(false);
        when(deptJobRepository.save(any(DeptJob.class))).thenAnswer(inv -> inv.getArgument(0));

        deptJobService.createDeptJob("USR_TESTER", dto);

        ArgumentCaptor<DeptJob> captor = ArgumentCaptor.forClass(DeptJob.class);
        verify(deptJobRepository).save(captor.capture());
        assertEquals("USR_OTHER", captor.getValue().getPicId());
    }

    @Test
    @DisplayName("부서업무 수정")
    void updateDeptJob() {
        when(deptJobRepository.findById("JOB1")).thenReturn(Optional.of(deptJob));
        
        DeptJobDto dto = new DeptJobDto();
        dto.setDeptTaskNm("Updated Job");

        // 소유권 가드(정적)는 단위 테스트에서 no-op 처리(SecurityContext 부재) — WorkReportServiceTest 선례.
        try (var mocked = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            deptJobService.updateDeptJob("JOB1", dto);
        }

        assertEquals("Updated Job", deptJob.getDeptTaskNm());
    }

    @Test
    @DisplayName("부서업무 삭제")
    void deleteDeptJob() {
        // 종전에는 deleteById 로 존재 확인도 소유권 검증도 없이 지웠다.
        when(deptJobRepository.findById("JOB1")).thenReturn(Optional.of(deptJob));

        try (var mocked = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            deptJobService.deleteDeptJob("JOB1");
        }

        verify(deptJobRepository, times(1)).delete(deptJob);
    }

    @Test
    @DisplayName("부서업무 삭제 - 존재하지 않으면 404")
    void deleteDeptJob_NotFound() {
        when(deptJobRepository.findById("JOB99")).thenReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> deptJobService.deleteDeptJob("JOB99"));
        verify(deptJobRepository, never()).delete(any(DeptJob.class));
    }

    @Test
    @DisplayName("[회귀] 업무함 미지정(null) 업무도 조회할 수 있다")
    void getDeptJob_withoutBox() {
        // 종전에는 toDto 가 nullable 컬럼(dept_task_box_id, pic_id)에 required() 가드를 걸어,
        // 업무함을 지정하지 않은 업무가 하나라도 있으면 조회가 통째로 400 으로 떨어졌다.
        // 등록 폼에 업무함 선택 UI 가 없으므로 새 업무는 항상 이 상태다 —
        // 즉 데이터가 생기는 순간 조회가 깨지는 구조였다.
        DeptJob noBox = DeptJob.builder()
                .deptTaskId("TASK_NOBOX")
                .deptTaskNm("업무함 없는 업무")
                .build();
        when(deptJobRepository.findById("TASK_NOBOX")).thenReturn(Optional.of(noBox));

        DeptJobDto dto = assertDoesNotThrow(() -> deptJobService.getDeptJob("TASK_NOBOX"));

        assertEquals("TASK_NOBOX", dto.getDeptTaskId());
        assertNull(dto.getDeptTaskBoxNm());
        assertNull(dto.getPicNm());
    }
}
