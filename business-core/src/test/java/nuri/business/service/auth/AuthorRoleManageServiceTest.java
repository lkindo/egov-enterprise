package nuri.business.service.auth;

import nuri.business.domain.auth.AuthorRoleProjection;
import nuri.business.domain.auth.AuthorityRoleRepository;
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

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
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

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강] 페이징 계산과 반환 경로가 검증되지 않아 5개가 살아남았다.
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("목록 조회: 페이징 규칙이 적용되고 권한코드가 그대로 전달된다")
    void listAppliesPagingAndPassesAuthorityCode() {
        BaseSearchDto vo = new BaseSearchDto();
        vo.setPageIndex(3);
        vo.setPageUnit(0);
        Page<AuthorRoleProjection> expected = new PageImpl<>(List.of());
        given(authorityRoleRepository.searchAuthorRoles(any(), any(Pageable.class))).willReturn(expected);

        // `replaced return value with null` 뮤턴트는 이 동일성 단언에서 죽는다.
        assertSame(expected, authorRoleManageService.selectAuthorRoleList("ROLE_ADMIN", vo));

        org.mockito.ArgumentCaptor<String> cd = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.ArgumentCaptor<Pageable> captor = org.mockito.ArgumentCaptor.forClass(Pageable.class);
        verify(authorityRoleRepository).searchAuthorRoles(cd.capture(), captor.capture());
        assertEquals("ROLE_ADMIN", cd.getValue(), "권한코드가 다른 권한으로 새면 남의 롤 목록이 보인다");
        assertEquals(2, captor.getValue().getPageNumber(), "1-based 3페이지는 0-based 2");
        assertEquals(10, captor.getValue().getPageSize(), "pageUnit 0 이면 기본 10");
    }

    @Test
    @DisplayName("롤 할당: 기존 매핑을 지운 뒤 요청한 롤만 저장한다 (null 항목 제외)")
    @SuppressWarnings("unchecked")
    void insertAuthorRoleReplacesMappings() {
        authorRoleManageService.insertAuthorRole("ROLE_ADMIN",
                java.util.Arrays.asList("R1", null, "R2"));

        verify(authorityRoleRepository).deleteByIdAuthrtCd("ROLE_ADMIN");

        org.mockito.ArgumentCaptor<List<nuri.business.domain.auth.AuthorityRole>> saved =
                org.mockito.ArgumentCaptor.forClass(List.class);
        verify(authorityRoleRepository).saveAll(saved.capture());
        // 매핑 생성 람다의 `replaced return value with null` 뮤턴트는 여기서 죽는다.
        assertEquals(2, saved.getValue().size(), "null 롤은 제외돼야 한다");
        assertNotNull(saved.getValue().get(0));
        assertEquals("ROLE_ADMIN", saved.getValue().get(0).getId().getAuthrtCd());
        assertEquals("R1", saved.getValue().get(0).getId().getRoleCd());
        assertEquals("R2", saved.getValue().get(1).getId().getRoleCd());
    }
}
