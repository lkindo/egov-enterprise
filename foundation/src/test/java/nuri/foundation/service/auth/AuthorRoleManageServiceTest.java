package nuri.foundation.service.auth;

import nuri.foundation.domain.auth.AuthorRoleProjection;
import nuri.foundation.domain.auth.AuthorityRoleRepository;
import nuri.foundation.domain.common.BaseSearchDto;
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

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthorRoleManageService 단위 테스트")
class AuthorRoleManageServiceTest {

    @Mock
    private AuthorityRoleRepository authorityRoleRepository;

    @InjectMocks
    private AuthorRoleManageService authorRoleManageService;

    @Test
    @DisplayName("권한-롤 목록 조회 테스트")
    void selectAuthorRoleListTest() {
        BaseSearchDto searchVO = new BaseSearchDto();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);
        
        Page<AuthorRoleProjection> page = new PageImpl<>(List.of());
        given(authorityRoleRepository.searchAuthorRoles(eq("ROLE_ADMIN"), any(Pageable.class))).willReturn(page);

        authorRoleManageService.selectAuthorRoleList("ROLE_ADMIN", searchVO);

        verify(authorityRoleRepository).searchAuthorRoles(eq("ROLE_ADMIN"), any(Pageable.class));
    }

    @Test
    @DisplayName("권한-롤 할당 정보 저장 테스트")
    void insertAuthorRoleTest() {
        List<String> roleCodes = List.of("ROLE_URL_1", "ROLE_URL_2");
        
        authorRoleManageService.insertAuthorRole("ROLE_ADMIN", roleCodes);

        verify(authorityRoleRepository).deleteByIdAuthrtCd("ROLE_ADMIN");
        verify(authorityRoleRepository).saveAll(anyList());
    }
}
