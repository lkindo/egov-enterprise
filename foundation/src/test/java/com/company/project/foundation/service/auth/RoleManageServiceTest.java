package com.company.project.foundation.service.auth;

import com.company.project.foundation.domain.auth.RoleInfo;
import com.company.project.foundation.domain.auth.RoleInfoRepository;
import com.company.project.foundation.service.auth.dto.RoleManageDto;
import egovframework.com.cmm.ComDefaultVO;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoleManageServiceTest {

    @Mock
    private RoleInfoRepository roleInfoRepository;

    @InjectMocks
    private RoleManageService roleManageService;

    @Test
    @DisplayName("역할 목록 조회 테스트")
    void selectRoleListTest() {
        // Given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);
        
        RoleInfo roleInfo = RoleInfo.builder()
                .roleCode("ROLE_USER")
                .roleNm("User Role")
                .build();
        Page<RoleInfo> page = new PageImpl<>(Collections.singletonList(roleInfo));
        
        when(roleInfoRepository.findAll(any(Pageable.class))).thenReturn(page);

        // When
        List<RoleManageDto> result = roleManageService.selectRoleList(searchVO);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRoleCode()).isEqualTo("ROLE_USER");
        verify(roleInfoRepository).findAll(any(Pageable.class));
    }

    @Test
    @DisplayName("역할 상세 조회 테스트")
    void selectRoleTest() {
        // Given
        String roleCode = "ROLE_ADMIN";
        RoleInfo roleInfo = RoleInfo.builder()
                .roleCode(roleCode)
                .roleNm("Admin Role")
                .build();
        
        when(roleInfoRepository.findById(roleCode)).thenReturn(Optional.of(roleInfo));

        // When
        RoleManageDto result = roleManageService.selectRole(roleCode);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getRoleCode()).isEqualTo(roleCode);
        verify(roleInfoRepository).findById(roleCode);
    }

    @Test
    @DisplayName("역할 등록 테스트")
    void insertRoleTest() {
        // Given
        RoleManageDto dto = RoleManageDto.builder()
                .roleNm("New Role")
                .roleDc("Description")
                .build();

        // When
        roleManageService.insertRole(dto);

        // Then
        verify(roleInfoRepository).save(any(RoleInfo.class));
    }

    @Test
    @DisplayName("역할 수정 테스트")
    void updateRoleTest() {
        // Given
        String roleCode = "ROLE_TARGET";
        RoleManageDto dto = RoleManageDto.builder()
                .roleCode(roleCode)
                .roleNm("Updated Name")
                .build();
        RoleInfo roleInfo = mock(RoleInfo.class);
        
        when(roleInfoRepository.findById(roleCode)).thenReturn(Optional.of(roleInfo));

        // When
        roleManageService.updateRole(dto);

        // Then
        verify(roleInfo).update(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("역할 삭제 테스트")
    void deleteRoleTest() {
        // Given
        String roleCode = "ROLE_DELETE";

        // When
        roleManageService.deleteRole(roleCode);

        // Then
        verify(roleInfoRepository).deleteById(roleCode);
    }
}
