package nuri.business.service.auth;

import nuri.business.domain.auth.RoleInfo;
import nuri.business.domain.auth.RoleInfoRepository;
import nuri.business.service.auth.dto.RoleManageDto;
import nuri.business.domain.common.BaseSearchDto;
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
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("RoleManageService (롤 관리) 테스트")
class RoleManageServiceTest {

    @Mock
    private RoleInfoRepository roleInfoRepository;

    @InjectMocks
    private RoleManageService roleManageService;

    @Test
    @DisplayName("롤 목록 조회 테스트")
    void selectRoleListTest() {
        // Given
        BaseSearchDto searchVO = new BaseSearchDto();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);
        
        RoleInfo roleInfo = RoleInfo.builder()
                .roleId("ROLE_USER")
                .roleNm("User Role")
                .build();
        Page<RoleInfo> page = new PageImpl<>(Collections.singletonList(roleInfo));
        
        when(roleInfoRepository.findAll(any(Pageable.class))).thenReturn(page);

        // When
        List<RoleManageDto> result = roleManageService.selectRoleList(searchVO);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRoleId()).isEqualTo("ROLE_USER");
        verify(roleInfoRepository).findAll(any(Pageable.class));
    }

    @Test
    @DisplayName("롤 상세 조회 테스트")
    void selectRoleTest() {
        // Given
        String roleCode = "ROLE_ADMIN";
        RoleInfo roleInfo = RoleInfo.builder()
                .roleId(roleCode)
                .roleNm("Admin Role")
                .build();
        
        when(roleInfoRepository.findById(roleCode)).thenReturn(Optional.of(roleInfo));

        // When
        RoleManageDto result = roleManageService.selectRole(roleCode);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getRoleId()).isEqualTo(roleCode);
        verify(roleInfoRepository).findById(roleCode);
    }

    @Test
    @DisplayName("롤 등록 테스트")
    void insertRoleTest() {
        // Given
        RoleManageDto dto = RoleManageDto.builder()
                .roleNm("New Role")
                .roleExpln("Description")
                .build();

        // When
        roleManageService.insertRole(dto);

        // Then
        verify(roleInfoRepository).save(any(RoleInfo.class));
    }

    @Test
    @DisplayName("롤 수정 테스트")
    void updateRoleTest() {
        // Given
        String roleCode = "ROLE_TARGET";
        RoleManageDto dto = RoleManageDto.builder()
                .roleId(roleCode)
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
    @DisplayName("롤 삭제 테스트")
    void deleteRoleTest() {
        // Given
        String roleCode = "ROLE_DELETE";

        // When
        roleManageService.deleteRole(roleCode);

        // Then
        verify(roleInfoRepository).deleteById(roleCode);
    }
    @Test
    @DisplayName("롤 상세 조회 실패 테스트")
    void selectRole_NotFoundTest() {
        // Given
        String roleCode = "NOT_FOUND";
        when(roleInfoRepository.findById(roleCode)).thenReturn(Optional.empty());

        // When
        RoleManageDto result = roleManageService.selectRole(roleCode);

        // Then
        assertThat(result).isNull();
    }

    @Test
    @DisplayName("롤 등록 테스트 - 코드 포함")
    void insertRole_WithCodeTest() {
        // Given
        RoleManageDto dto = RoleManageDto.builder()
                .roleId("ROLE_SPECIFIC")
                .roleNm("New Role")
                .build();

        // When
        roleManageService.insertRole(dto);

        // Then
        verify(roleInfoRepository).save(argThat(entity -> entity.getRoleId().equals("ROLE_SPECIFIC")));
    }

    @Test
    @DisplayName("여러 롤 삭제 테스트")
    void deleteRolesTest() {
        // Given
        String[] roleCodes = {"ROLE_1", "ROLE_2"};

        // When
        roleManageService.deleteRoles(roleCodes);

        // Then
        verify(roleInfoRepository).deleteAllByIdInBatch(anyList());
    }

    @Test
    @DisplayName("롤 목록 조회 - pageUnit이 0 이하일 경우 10으로 설정")
    void selectRoleList_PageUnitZeroTest() {
        BaseSearchDto searchVO = new BaseSearchDto();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(0);
        
        RoleInfo roleInfo = RoleInfo.builder().roleId("ROLE_USER").build();
        Page<RoleInfo> page = new PageImpl<>(Collections.singletonList(roleInfo));
        
        when(roleInfoRepository.findAll(any(Pageable.class))).thenReturn(page);
        
        List<RoleManageDto> result = roleManageService.selectRoleList(searchVO);
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("롤 등록 - roleId가 empty string일 경우 UUID 생성, roleSort 있는 경우")
    void insertRole_EmptyId_WithSortTest() {
        RoleManageDto dto = RoleManageDto.builder()
                .roleId("")
                .roleNm("Empty ID Role")
                .roleSort("99")
                .build();

        roleManageService.insertRole(dto);
        verify(roleInfoRepository).save(argThat(entity -> entity.getRoleSort() == 99 && entity.getRoleId().startsWith("ROLE_")));
    }

    @Test
    @DisplayName("롤 수정 - roleSort 있는 경우")
    void updateRole_WithSortTest() {
        String roleCode = "ROLE_TARGET";
        RoleManageDto dto = RoleManageDto.builder()
                .roleId(roleCode)
                .roleNm("Updated Name")
                .roleSort("100")
                .build();
        RoleInfo roleInfo = mock(RoleInfo.class);
        
        when(roleInfoRepository.findById(roleCode)).thenReturn(Optional.of(roleInfo));

        roleManageService.updateRole(dto);
        verify(roleInfo).update(any(), any(), any(), any(), eq(100));
    }

    @Test
    @DisplayName("DTO 변환 - roleSort, createdDate 있는 경우")
    void toDto_WithValuesTest() {
        String roleCode = "ROLE_ADMIN";
        RoleInfo roleInfo = RoleInfo.builder()
                .roleId(roleCode)
                .roleSort(5)
                .build();
        roleInfo.setCrtDt(java.time.LocalDateTime.now());
        
        when(roleInfoRepository.findById(roleCode)).thenReturn(Optional.of(roleInfo));

        RoleManageDto result = roleManageService.selectRole(roleCode);

        assertThat(result.getRoleSort()).isEqualTo("5");
        assertThat(result.getCrtDt()).isNotNull();
    }

    // [2026-08-09 뮤테이션 보강] 페이징 계산과 총건수 반환이 검증되지 않았다.

    @Test
    @DisplayName("목록 조회: 1-based pageIndex 변환과 기본 페이지 크기가 적용된다")
    void listAppliesPagingRules() {
        BaseSearchDto vo = new BaseSearchDto();
        vo.setPageIndex(3);
        vo.setPageUnit(0);
        given(roleInfoRepository.findAll(any(org.springframework.data.domain.Pageable.class)))
                .willReturn(new org.springframework.data.domain.PageImpl<>(java.util.List.of()));

        roleManageService.selectRoleList(vo);

        org.mockito.ArgumentCaptor<org.springframework.data.domain.Pageable> captor =
                org.mockito.ArgumentCaptor.forClass(org.springframework.data.domain.Pageable.class);
        verify(roleInfoRepository).findAll(captor.capture());
        assertEquals(2, captor.getValue().getPageNumber(), "1-based 3페이지는 0-based 2");
        assertEquals(10, captor.getValue().getPageSize(), "pageUnit 0 이면 기본 10");
    }

    @Test
    @DisplayName("총건수는 저장소 count 를 그대로 돌려준다")
    void totalCountReflectsRepositoryCount() {
        given(roleInfoRepository.count()).willReturn(5L);

        // `replaced int return with 0` 뮤턴트가 여기서 죽는다.
        assertEquals(5, roleManageService.selectRoleListTotCnt(new BaseSearchDto()));
    }
}
