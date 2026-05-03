package nuri.foundation.service.auth;

import nuri.foundation.domain.auth.AuthorGroupProjection;
import nuri.foundation.domain.auth.DeptAuthorProjection;
import nuri.foundation.domain.auth.UserAuthority;
import nuri.foundation.domain.auth.UserAuthorityRepository;
import nuri.foundation.domain.common.BaseSearchDto;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.service.auth.dto.DeptAuthorBatchRequest;
import nuri.foundation.service.auth.dto.UserAuthorityDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserAuthorityManageService 단위 테스트")
class UserAuthorityManageServiceTest {

    @Mock
    private UserAuthorityRepository userAuthorityRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserAuthorityManageService userAuthorityManageService;

    @Test
    @DisplayName("사용자별 권한 목록 조회 테스트")
    void selectUserAuthorityListTest() {
        BaseSearchDto searchVO = new BaseSearchDto();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);
        
        Page<AuthorGroupProjection> page = new PageImpl<>(List.of());
        given(userAuthorityRepository.searchAuthorGroups(any(), any(), any(Pageable.class))).willReturn(page);

        userAuthorityManageService.selectUserAuthorityList(searchVO);

        verify(userAuthorityRepository).searchAuthorGroups(any(), any(), any(Pageable.class));
    }

    @Test
    @DisplayName("사용자의 권한 정보 저장 테스트 - 신규 등록")
    void saveUserAuthoritiesNewTest() {
        UserAuthorityDto dto = UserAuthorityDto.builder()
                .uniqId("USER1")
                .authorCode("ROLE_ADMIN")
                .build();
        
        given(userAuthorityRepository.findById("USER1")).willReturn(Optional.empty());

        userAuthorityManageService.saveUserAuthorities(List.of(dto));

        verify(userAuthorityRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("사용자의 권한 정보 저장 테스트 - 기존 수정")
    void saveUserAuthoritiesUpdateTest() {
        UserAuthorityDto dto = UserAuthorityDto.builder()
                .uniqId("USER1")
                .authorCode("ROLE_USER")
                .build();
        
        UserAuthority existing = mock(UserAuthority.class);
        given(userAuthorityRepository.findById("USER1")).willReturn(Optional.of(existing));

        userAuthorityManageService.saveUserAuthorities(List.of(dto));

        verify(existing).update(eq("ROLE_USER"), any());
        verify(userAuthorityRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("사용자의 권한 삭제 테스트")
    void deleteUserAuthoritiesTest() {
        List<String> ids = List.of("USER1", "USER2");
        
        userAuthorityManageService.deleteUserAuthorities(ids);

        verify(userAuthorityRepository).deleteAllByIdInBatch(ids);
    }

    @Test
    @DisplayName("부서별 권한 일괄 저장 테스트 - 모든 멤버")
    void saveDeptAuthoritiesAllMembersTest() {
        DeptAuthorBatchRequest request = new DeptAuthorBatchRequest();
        request.setDeptId("DEPT1");
        request.setAuthorCode("ROLE_DEPT");
        request.setAllMembers(true);
        
        User user = mock(User.class);
        given(user.getEsntlId()).willReturn("USER1");
        given(userRepository.findByOrgnztId("DEPT1")).willReturn(List.of(user));
        given(userAuthorityRepository.findById("USER1")).willReturn(Optional.empty());

        userAuthorityManageService.saveDeptAuthorities(request);

        verify(userAuthorityRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("부서별 권한 일괄 저장 테스트 - 특정 멤버")
    void saveDeptAuthoritiesSpecificMembersTest() {
        DeptAuthorBatchRequest request = new DeptAuthorBatchRequest();
        request.setDeptId("DEPT1");
        request.setAuthorCode("ROLE_DEPT");
        request.setAllMembers(false);
        request.setUserIds(List.of("USER1"));
        
        given(userAuthorityRepository.findById("USER1")).willReturn(Optional.empty());

        userAuthorityManageService.saveDeptAuthorities(request);

        verify(userAuthorityRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("null 또는 빈 데이터 처리 테스트")
    void handleEmptyDataTest() {
        assertDoesNotThrow(() -> {
            userAuthorityManageService.saveUserAuthorities(null);
            userAuthorityManageService.saveUserAuthorities(List.of());
            userAuthorityManageService.deleteUserAuthorities(null);
            userAuthorityManageService.saveDeptAuthorities(null);
        });
    }
}
