package com.company.project.service.sec;

import com.company.project.domain.auth.AuthorityRepository;
import com.company.project.domain.auth.AuthorityRoleRepository;
import com.company.project.domain.auth.RoleInfo;
import com.company.project.domain.auth.RoleInfoRepository;
import com.company.project.service.sec.dto.RoleDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthorManageServiceTest {

    @Mock
    private AuthorityRepository authorityRepository;

    @Mock
    private RoleInfoRepository roleInfoRepository;

    @Mock
    private AuthorityRoleRepository authorityRoleRepository;

    @InjectMocks
    private AuthorManageServiceImpl authorManageService;

    @Test
    @DisplayName("updateRole should update RoleInfo fields")
    void updateRole_shouldUpdateRoleInfoFields() {
        // Given
        String roleCode = "ROLE_TEST";
        RoleDto dto = RoleDto.builder()
                .roleCode(roleCode)
                .roleNm("Updated Name")
                .rolePtn("Updated Pattern")
                .roleDc("Updated Desc")
                .roleTyp("Updated Type")
                .roleSort("Updated Sort")
                .build();

        RoleInfo role = RoleInfo.builder()
                .roleCode(roleCode)
                .roleNm("Original Name")
                .rolePttrn("Original Pattern")
                .roleDc("Original Desc")
                .roleTy("Original Type")
                .roleSort("Original Sort")
                .build();

        when(roleInfoRepository.findById(roleCode)).thenReturn(Optional.of(role));

        // When
        authorManageService.updateRole(dto);

        // Then
        // Since update method modifies the object state in place, we can verify the object state
        assertEquals("Updated Name", role.getRoleNm());
        assertEquals("Updated Pattern", role.getRolePttrn());
        assertEquals("Updated Desc", role.getRoleDc());
        assertEquals("Updated Type", role.getRoleTy());
        assertEquals("Updated Sort", role.getRoleSort());

        // Verify findById was called
        verify(roleInfoRepository, times(1)).findById(roleCode);
    }
}
