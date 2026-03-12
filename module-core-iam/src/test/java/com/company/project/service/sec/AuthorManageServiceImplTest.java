package com.company.project.service.sec;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.auth.*;
import com.company.project.service.sec.dto.AuthorDto;
import com.company.project.service.sec.dto.RoleDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthorManageServiceImpl 테스트")
class AuthorManageServiceImplTest {

    @Mock
    private AuthorityRepository authorityRepository;
    @Mock
    private RoleInfoRepository roleInfoRepository;
    @Mock
    private AuthorityRoleRepository authorityRoleRepository;

    @InjectMocks
    private AuthorManageServiceImpl authorManageService;

    // --- Authority Tests ---

    @Test
    @DisplayName("권한 목록 조회 성공")
    void selectAuthorList_Success() {
        Authority auth = Authority.builder().authorCode("A1").authorNm("N1").build();
        given(authorityRepository.findAll()).willReturn(List.of(auth));

        List<AuthorDto> result = authorManageService.selectAuthorList();
        
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAuthorCode()).isEqualTo("A1");
    }

    @Test
    @DisplayName("권한 상세 조회 성공")
    void selectAuthor_Success() {
        Authority auth = Authority.builder().authorCode("A1").authorNm("N1").build();
        given(authorityRepository.findById("A1")).willReturn(Optional.of(auth));

        AuthorDto result = authorManageService.selectAuthor("A1");
        assertThat(result.getAuthorCode()).isEqualTo("A1");
    }

    @Test
    @DisplayName("권한 상세 조회 실패 - 존재하지 않음")
    void selectAuthor_NotFound() {
        given(authorityRepository.findById("A1")).willReturn(Optional.empty());
        assertThatThrownBy(() -> authorManageService.selectAuthor("A1"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("권한 등록 성공")
    void insertAuthor_Success() {
        AuthorDto dto = AuthorDto.builder().authorCode("A1").authorNm("N1").build();
        authorManageService.insertAuthor(dto);
        verify(authorityRepository).save(any(Authority.class));
    }

    @Test
    @DisplayName("권한 수정 성공")
    void updateAuthor_Success() {
        Authority auth = Authority.builder().authorCode("A1").authorNm("Old").build();
        given(authorityRepository.findById("A1")).willReturn(Optional.of(auth));

        AuthorDto dto = AuthorDto.builder().authorCode("A1").authorNm("New").build();
        authorManageService.updateAuthor(dto);
        
        assertThat(auth.getAuthorNm()).isEqualTo("New");
    }

    @Test
    @DisplayName("권한 삭제 성공")
    void deleteAuthor_Success() {
        authorManageService.deleteAuthor("A1");
        verify(authorityRepository).deleteById("A1");
    }

    // --- Role Tests ---

    @Test
    @DisplayName("롤 목록 조회 성공")
    void selectRoleList_Success() {
        RoleInfo role = RoleInfo.builder().roleCode("R1").roleNm("RN1").build();
        given(roleInfoRepository.findAll()).willReturn(List.of(role));

        List<RoleDto> result = authorManageService.selectRoleList();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRoleCode()).isEqualTo("R1");
    }

    @Test
    @DisplayName("롤 상세 조회 성공")
    void selectRole_Success() {
        RoleInfo role = RoleInfo.builder().roleCode("R1").roleNm("RN1").build();
        given(roleInfoRepository.findById("R1")).willReturn(Optional.of(role));

        RoleDto result = authorManageService.selectRole("R1");
        assertThat(result.getRoleCode()).isEqualTo("R1");
    }

    @Test
    @DisplayName("롤 상세 조회 실패 - 존재하지 않음")
    void selectRole_NotFound() {
        given(roleInfoRepository.findById("R1")).willReturn(Optional.empty());
        assertThatThrownBy(() -> authorManageService.selectRole("R1"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("롤 등록 성공")
    void insertRole_Success() {
        RoleDto dto = RoleDto.builder().roleCode("R1").roleNm("RN1").build();
        authorManageService.insertRole(dto);
        verify(roleInfoRepository).save(any(RoleInfo.class));
    }

    @Test
    @DisplayName("롤 수정 성공")
    void updateRole_Success() {
        RoleInfo role = RoleInfo.builder().roleCode("R1").roleNm("Old").build();
        given(roleInfoRepository.findById("R1")).willReturn(Optional.of(role));

        RoleDto dto = RoleDto.builder().roleCode("R1").roleNm("New").build();
        authorManageService.updateRole(dto);
        assertThat(role.getRoleNm()).isEqualTo("New");
    }

    @Test
    @DisplayName("롤 삭제 성공")
    void deleteRole_Success() {
        authorManageService.deleteRole("R1");
        verify(roleInfoRepository).deleteById("R1");
    }

    // --- Relationship Tests ---

    @Test
    @DisplayName("권한-롤 매핑 정보 등록 성공")
    void insertAuthorRoleRelate_Success() {
        given(authorityRepository.existsById("A1")).willReturn(true);
        
        authorManageService.insertAuthorRoleRelate("A1", List.of("R1", "R2"));
        
        verify(authorityRoleRepository).deleteByIdAuthorCode("A1");
        verify(authorityRoleRepository).saveAll(any());
    }

    @Test
    @DisplayName("권한-롤 매핑 정보 등록 실패 - 권한 없음")
    void insertAuthorRoleRelate_AuthorNotFound() {
        given(authorityRepository.existsById("A1")).willReturn(false);
        assertThatThrownBy(() -> authorManageService.insertAuthorRoleRelate("A1", List.of("R1")))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("권한별 롤 목록 조회 성공")
    void selectAuthorRoleList_Success() {
        AuthorityRole.AuthorityRoleId id = AuthorityRole.AuthorityRoleId.builder()
                .authorCode("A1").roleCode("R1").build();
        AuthorityRole relate = AuthorityRole.builder().id(id).build();
        
        given(authorityRoleRepository.findByIdAuthorCode("A1")).willReturn(List.of(relate));
        
        RoleInfo role = RoleInfo.builder().roleCode("R1").roleNm("RN1").build();
        given(roleInfoRepository.findAllById(List.of("R1"))).willReturn(List.of(role));

        List<RoleDto> result = authorManageService.selectAuthorRoleList("A1");
        
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRoleCode()).isEqualTo("R1");
    }

    @Test
    @DisplayName("권한별 롤 목록 조회 - 매핑 데이터 없음")
    void selectAuthorRoleList_Empty() {
        given(authorityRoleRepository.findByIdAuthorCode("A1")).willReturn(Collections.emptyList());
        List<RoleDto> result = authorManageService.selectAuthorRoleList("A1");
        assertThat(result).isEmpty();
    }
}
