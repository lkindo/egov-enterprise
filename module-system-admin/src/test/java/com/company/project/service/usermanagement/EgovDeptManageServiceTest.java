package com.company.project.service.usermanagement;

import com.company.project.domain.user.entity.DeptManage;
import com.company.project.domain.user.repository.DeptManageRepository;
import com.company.project.service.usermanagement.dto.DeptManageDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EgovDeptManageService 단위 테스트")
class EgovDeptManageServiceTest {

    @Mock
    private DeptManageRepository deptManageRepository;

    @InjectMocks
    private DeptManageServiceImpl deptManageService;

    @Test
    @DisplayName("부서 목록 조회 테스트")
    void selectDeptManageListTest() {
        // Given
        when(deptManageRepository.searchDeptManages(anyString(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        // When
        Page<DeptManageDto> result = deptManageService.getDeptManageList("Keyword", Pageable.unpaged());

        // Then
        assertThat(result.getContent()).isEmpty();
    }

    @Test
    @DisplayName("부서 상세 조회 테스트")
    void selectDeptManageTest() {
        // Given
        String deptId = "DEPT_001";
        DeptManage dept = DeptManage.builder().orgnztId(deptId).build();
        when(deptManageRepository.findById(deptId)).thenReturn(Optional.of(dept));

        // When
        DeptManageDto result = deptManageService.getDeptManage(deptId);

        // Then
        assertThat(result.getOrgnztId()).isEqualTo(deptId);
    }

    @Test
    @DisplayName("부서 등록 테스트")
    void insertDeptManageTest() {
        // Given
        DeptManageDto dto = new DeptManageDto();
        dto.setOrgnztNm("Test Dept");

        // When
        deptManageService.insertDeptManage(dto);

        // Then
        verify(deptManageRepository).save(any());
    }

    @Test
    @DisplayName("부서 삭제 테스트")
    void deleteDeptManageTest() {
        // When
        deptManageService.deleteDeptManage("DEPT_001");

        // Then
        verify(deptManageRepository).deleteById("DEPT_001");
    }
}
