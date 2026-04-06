package nuri.business.service.deptjob;

import nuri.business.domain.deptjob.DeptJob;
import nuri.business.domain.deptjob.DeptJobRepository;
import nuri.business.domain.deptjob.DeptJobBox;
import nuri.business.domain.deptjob.DeptJobBoxRepository;
import nuri.business.domain.organization.OrganizationManage;
import nuri.business.domain.organization.OrganizationManageRepository;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.business.service.deptjob.dto.DeptJobDto;
import com.querydsl.core.types.Predicate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("DeptJobService 테스트")
class DeptJobServiceTest {

    @Mock
    private DeptJobRepository deptJobRepository;
    @Mock
    private DeptJobBoxRepository deptJobBoxRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private OrganizationManageRepository organizationManageRepository;

    @InjectMocks
    private DeptJobService deptJobService;

    @Test
    @DisplayName("부서업무 목록 조회 테스트")
    void getDeptJobListTest() {
        Pageable pageable = PageRequest.of(0, 10);
        given(deptJobRepository.findAll(any(Predicate.class), any(Pageable.class))).willReturn(new PageImpl<>(List.of()));

        deptJobService.getDeptJobList("DEPT1", null, "0", "keyword", pageable);
        verify(deptJobRepository).findAll(any(Predicate.class), any(Pageable.class));
    }

    @Test
    @DisplayName("부서업무 상세 조회 테스트")
    void getDeptJobTest() {
        DeptJob job = DeptJob.builder().deptJobId("J1").deptJobbxId("B1").chargerId("U1").build();
        given(deptJobRepository.findById("J1")).willReturn(Optional.of(job));
        
        DeptJobBox box = DeptJobBox.builder().deptJobbxId("B1").deptId("D1").deptJobbxNm("Box1").build();
        given(deptJobBoxRepository.findById("B1")).willReturn(Optional.of(box));

        OrganizationManage org = OrganizationManage.builder().orgnztId("D1").orgnztNm("Org1").build();
        given(organizationManageRepository.findById("D1")).willReturn(Optional.of(org));

        User user = User.builder()
                .userId("user1")
                .esntlId("U1")
                .userNm("User1")
                .password("password")
                .build();
        given(userRepository.findByEsntlId("U1")).willReturn(Optional.of(user));

        DeptJobDto result = deptJobService.getDeptJob("J1");
        assertThat(result.getDeptJobId()).isEqualTo("J1");
        assertThat(result.getDeptJobbxNm()).isEqualTo("Box1");
        assertThat(result.getDeptNm()).isEqualTo("Org1");
        assertThat(result.getChargerNm()).isEqualTo("User1");
    }

    @Test
    @DisplayName("부서업무 생성 테스트")
    void createDeptJobTest() {
        DeptJobDto dto = DeptJobDto.builder().deptJobId("J1").deptJobNm("Test").build();
        deptJobService.createDeptJob(dto);
        verify(deptJobRepository).save(any(DeptJob.class));
    }

    @Test
    @DisplayName("부서업무 수정 테스트")
    void updateDeptJobTest() {
        DeptJob job = DeptJob.builder().deptJobId("J1").deptJobNm("Old").build();
        given(deptJobRepository.findById("J1")).willReturn(Optional.of(job));

        DeptJobDto dto = DeptJobDto.builder().deptJobId("J1").deptJobNm("New").build();
        deptJobService.updateDeptJob("J1", dto);
        
        assertThat(job.getDeptJobNm()).isEqualTo("New");
    }

    @Test
    @DisplayName("부서업무 삭제 테스트")
    void deleteDeptJobTest() {
        deptJobService.deleteDeptJob("J1");
        verify(deptJobRepository).deleteById("J1");
    }
}
