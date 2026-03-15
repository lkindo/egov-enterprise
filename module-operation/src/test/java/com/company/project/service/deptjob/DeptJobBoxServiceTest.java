package com.company.project.service.deptjob;

import com.company.project.domain.deptjob.DeptJobBox;
import com.company.project.domain.deptjob.DeptJobBoxRepository;
import com.company.project.service.deptjob.dto.DeptJobBoxDto;
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
@DisplayName("DeptJobBoxService 테스트")
class DeptJobBoxServiceTest {

    @Mock
    private DeptJobBoxRepository deptJobBoxRepository;

    @InjectMocks
    private DeptJobBoxService deptJobBoxService;

    @Test
    @DisplayName("부서함 목록 조회 테스트")
    void getDeptJobBoxListTest() {
        Pageable pageable = PageRequest.of(0, 10);
        given(deptJobBoxRepository.findByKeyword("test", pageable)).willReturn(new PageImpl<>(List.of()));

        deptJobBoxService.getDeptJobBoxList("test", pageable);
        verify(deptJobBoxRepository).findByKeyword("test", pageable);
    }

    @Test
    @DisplayName("부서별 부서함 목록 조회 테스트")
    void getDeptJobBoxListByDeptTest() {
        Pageable pageable = PageRequest.of(0, 10);
        given(deptJobBoxRepository.findByDeptId("D1", pageable)).willReturn(new PageImpl<>(List.of()));

        deptJobBoxService.getDeptJobBoxListByDept("D1", pageable);
        verify(deptJobBoxRepository).findByDeptId("D1", pageable);
    }

    @Test
    @DisplayName("부서함 상세 조회 테스트")
    void getDeptJobBoxTest() {
        DeptJobBox box = DeptJobBox.builder().deptJobbxId("B1").build();
        given(deptJobBoxRepository.findById("B1")).willReturn(Optional.of(box));

        DeptJobBoxDto result = deptJobBoxService.getDeptJobBox("B1");
        assertThat(result.getDeptJobbxId()).isEqualTo("B1");
    }

    @Test
    @DisplayName("부서함 생성 테스트")
    void createDeptJobBoxTest() {
        DeptJobBoxDto dto = DeptJobBoxDto.builder().deptJobbxNm("New Box").build();
        
        deptJobBoxService.createDeptJobBox("user1", dto);
        verify(deptJobBoxRepository).save(any(DeptJobBox.class));
    }

    @Test
    @DisplayName("부서함 수정 테스트")
    void updateDeptJobBoxTest() {
        DeptJobBox box = DeptJobBox.builder()
                .deptJobbxId("B1")
                .deptJobbxNm("Old")
                .build();
        given(deptJobBoxRepository.findById("B1")).willReturn(Optional.of(box));
        DeptJobBoxDto dto = DeptJobBoxDto.builder().deptJobbxNm("Updated").build();

        deptJobBoxService.updateDeptJobBox("B1", "user1", dto);
        
        // 더티 체킹을 사용하므로 save 호출 여부 대신 엔티티 상태 변화를 확인
        assertThat(box.getDeptJobbxNm()).isEqualTo("Updated");
    }

    @Test
    @DisplayName("부서함 삭제 테스트")
    void deleteDeptJobBoxTest() {
        deptJobBoxService.deleteDeptJobBox("B1");
        verify(deptJobBoxRepository).deleteById("B1");
    }
}
