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
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
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
    @DisplayName("부서업무 생성")
    void createDeptJob() {
        DeptJobDto dto = new DeptJobDto();
        dto.setDeptTaskId("JOB1");
        dto.setDeptTaskBoxId("BOX1");
        dto.setDeptTaskNm("Test Job");
        
        when(deptJobRepository.save(any(DeptJob.class))).thenReturn(deptJob);

        String result = deptJobService.createDeptJob(dto);

        assertNotNull(result);
        verify(deptJobRepository, times(1)).save(any(DeptJob.class));
    }

    @Test
    @DisplayName("부서업무 수정")
    void updateDeptJob() {
        when(deptJobRepository.findById("JOB1")).thenReturn(Optional.of(deptJob));
        
        DeptJobDto dto = new DeptJobDto();
        dto.setDeptTaskNm("Updated Job");

        deptJobService.updateDeptJob("JOB1", dto);

        assertEquals("Updated Job", deptJob.getDeptTaskNm());
    }

    @Test
    @DisplayName("부서업무 삭제")
    void deleteDeptJob() {
        doNothing().when(deptJobRepository).deleteById("JOB1");

        deptJobService.deleteDeptJob("JOB1");

        verify(deptJobRepository, times(1)).deleteById("JOB1");
    }
}
