package nuri.business.service.deptjob;


import nuri.business.domain.deptjob.DeptJob;
import nuri.business.domain.deptjob.DeptJobRepository;
import nuri.business.domain.deptjob.DeptJobBoxRepository;
import nuri.business.domain.deptjob.DeptJobBox;
import nuri.business.domain.organization.OrganizationManageRepository;
import nuri.business.domain.organization.OrganizationManage;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.domain.user.entity.User;
import nuri.business.service.deptjob.dto.DeptJobDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import com.querydsl.core.types.Predicate;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("DeptJobService 단위 테스트")
class DeptJobServiceTest {

    @InjectMocks
    private DeptJobService deptJobService;

    @Mock
    private DeptJobRepository deptJobRepository;

    @Mock
    private DeptJobBoxRepository deptJobBoxRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private OrganizationManageRepository organizationManageRepository;

    @Test
    @DisplayName("부서 업무 목록 조회 성공")
    void getDeptJobList_Success() {
        // given
        Page<DeptJob> page = new PageImpl<>(List.of(DeptJob.builder().deptJobId("JOB_01").deptJobbxId("BOX_01").chargerId("USER_01").build()));
        given(deptJobRepository.findAll(any(Predicate.class), any(Pageable.class))).willReturn(page);
        given(deptJobBoxRepository.findById("BOX_01")).willReturn(Optional.of(DeptJobBox.builder().deptId("DEPT_01").build()));
        given(organizationManageRepository.findById("DEPT_01")).willReturn(Optional.of(OrganizationManage.builder().orgnztNm("DeptName").build()));
        given(userRepository.findByEsntlId("USER_01")).willReturn(Optional.of(User.builder().userId("USER_01").esntlId("USER_01").userNm("UserName").password("pass").build()));

        // when
        Page<DeptJobDto> result = deptJobService.getDeptJobList(null, "BOX_01", null, null, Pageable.unpaged());

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("부서 업무 상세 조회 성공")
    void getDeptJob_Success() {
        // given
        DeptJob entity = DeptJob.builder().deptJobId("JOB_01").deptJobbxId("BOX_01").chargerId("USER_01").build();
        given(deptJobRepository.findById("JOB_01")).willReturn(Optional.of(entity));
        given(deptJobBoxRepository.findById("BOX_01")).willReturn(Optional.of(DeptJobBox.builder().deptId("DEPT_01").build()));
        given(organizationManageRepository.findById("DEPT_01")).willReturn(Optional.of(OrganizationManage.builder().orgnztNm("DeptName").build()));
        given(userRepository.findByEsntlId("USER_01")).willReturn(Optional.of(User.builder().userId("USER_01").esntlId("USER_01").userNm("UserName").password("pass").build()));

        // when
        DeptJobDto result = deptJobService.getDeptJob("JOB_01");

        // then
        assertThat(result.getDeptJobId()).isEqualTo("JOB_01");
    }

    @Test
    @DisplayName("부서 업무 생성 성공")
    void createDeptJob_Success() {
        // given
        DeptJobDto dto = DeptJobDto.builder().deptJobId("JOB_01").build();

        // when
        deptJobService.createDeptJob(dto);

        // then
        verify(deptJobRepository).save(any());
    }

    @Test
    @DisplayName("부서 업무 수정 성공")
    void updateDeptJob_Success() {
        // given
        DeptJob entity = DeptJob.builder().deptJobId("JOB_01").build();
        given(deptJobRepository.findById("JOB_01")).willReturn(Optional.of(entity));
        DeptJobDto dto = DeptJobDto.builder().deptJobNm("New Name").build();

        // when
        deptJobService.updateDeptJob("JOB_01", dto);

        // then
        verify(deptJobRepository).findById("JOB_01");
    }

    @Test
    @DisplayName("부서 업무 삭제 성공")
    void deleteDeptJob_Success() {
        // when
        deptJobService.deleteDeptJob("JOB_01");

        // then
        verify(deptJobRepository).deleteById("JOB_01");
    }
}
