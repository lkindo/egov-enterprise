package nuri.business.service.auth;

import nuri.business.domain.auth.AuthorGroupProjection;
import nuri.business.domain.auth.DeptAuthorProjection;
import nuri.business.domain.auth.UserAuthority;
import nuri.business.domain.auth.UserAuthorityRepository;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.auth.dto.DeptAuthorBatchRequest;
import nuri.business.service.auth.dto.UserAuthorityDto;
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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;
import org.mockito.ArgumentCaptor;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserAuthorityManageService 단위 테스트")
class UserAuthorityManageServiceTest {

    @Mock
    private UserAuthorityRepository userAuthorityRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private nuri.business.domain.auth.AuthorityRepository authorityRepository;

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
    @DisplayName("사용자 권한 목록: 1-based pageIndex 가 0-based 로 변환된다")
    void userAuthorityListConvertsPageIndex() {
        BaseSearchDto vo = new BaseSearchDto();
        vo.setPageIndex(3);
        vo.setPageUnit(15);
        given(userAuthorityRepository.searchAuthorGroups(any(), any(), any(Pageable.class)))
                .willReturn(new PageImpl<>(java.util.List.of()));

        userAuthorityManageService.selectUserAuthorityList(vo);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(userAuthorityRepository).searchAuthorGroups(any(), any(), captor.capture());
        assertEquals(2, captor.getValue().getPageNumber(), "1-based 3페이지는 0-based 2");
        assertEquals(15, captor.getValue().getPageSize());
    }

    @Test
    @DisplayName("사용자 권한 목록: pageUnit 0 이하는 기본 10 으로 대체된다")
    void userAuthorityListFallsBackToDefaultUnit() {
        BaseSearchDto vo = new BaseSearchDto();
        vo.setPageIndex(1);
        vo.setPageUnit(0);
        given(userAuthorityRepository.searchAuthorGroups(any(), any(), any(Pageable.class)))
                .willReturn(new PageImpl<>(java.util.List.of()));

        userAuthorityManageService.selectUserAuthorityList(vo);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(userAuthorityRepository).searchAuthorGroups(any(), any(), captor.capture());
        assertEquals(0, captor.getValue().getPageNumber());
        assertEquals(10, captor.getValue().getPageSize(), "pageUnit 0 이면 기본 10");
    }

    @Test
    @DisplayName("사용자 권한 목록: 저장소 결과를 그대로 돌려준다 (null 대체 아님)")
    void userAuthorityListReturnsRepositoryPage() {
        BaseSearchDto vo = new BaseSearchDto();
        Page<AuthorGroupProjection> expected = new PageImpl<>(java.util.List.of());
        given(userAuthorityRepository.searchAuthorGroups(any(), any(), any(Pageable.class)))
                .willReturn(expected);

        // `replaced return value with null` 뮤턴트가 여기서 죽는다.
        assertSame(expected, userAuthorityManageService.selectUserAuthorityList(vo));
    }

    @Test
    @DisplayName("부서 권한 목록: 페이징 규칙이 동일하게 적용되고 deptCode 가 전달된다")
    void deptAuthorityListAppliesSamePagingAndPassesDeptCode() {
        BaseSearchDto vo = new BaseSearchDto();
        vo.setPageIndex(4);
        vo.setPageUnit(0);
        Page<DeptAuthorProjection> expected = new PageImpl<>(java.util.List.of());
        given(userAuthorityRepository.searchDeptAuthors(any(), any(Pageable.class))).willReturn(expected);

        // 이 메서드는 통째로 NO_COVERAGE 였다 — 호출 자체가 처음이다.
        assertSame(expected, userAuthorityManageService.selectDeptAuthorityList("DEPT9", vo));

        ArgumentCaptor<String> dept = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(userAuthorityRepository).searchDeptAuthors(dept.capture(), captor.capture());
        assertEquals("DEPT9", dept.getValue(), "deptCode 가 그대로 전달돼야 한다");
        assertEquals(3, captor.getValue().getPageNumber(), "1-based 4페이지는 0-based 3");
        assertEquals(10, captor.getValue().getPageSize(), "pageUnit 0 이면 기본 10");
    }
    @org.junit.jupiter.api.BeforeEach
    void authenticatedAdministrator() {
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
            nuri.business.support.AuthorizationTestPrincipal.authentication("admin","ESNTL_ADMIN","ADMIN"));
    }
    @org.junit.jupiter.api.AfterEach
    void clearContext() { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
    @Test
    void unversionedAssignmentsAreRejectedBeforeAnyPersistence() {
        java.util.List<Runnable> calls=java.util.List.of(
            () -> userAuthorityManageService.saveUserAuthorities(java.util.List.of()),
            () -> userAuthorityManageService.deleteUserAuthorities(java.util.List.of("USER")),
            () -> userAuthorityManageService.saveDeptAuthorities(new DeptAuthorBatchRequest()));
        for(var call:calls) org.assertj.core.api.Assertions.assertThatThrownBy(call::run)
            .isInstanceOfSatisfying(nuri.foundation.core.exception.BusinessException.class,
                e -> assertEquals(nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE,e.getErrorCode()));
        verifyNoInteractions(userAuthorityRepository,userRepository,authorityRepository);
    }
}
