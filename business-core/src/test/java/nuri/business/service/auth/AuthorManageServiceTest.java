package nuri.business.service.auth;

import nuri.business.domain.auth.Authority;
import nuri.business.domain.auth.AuthorityRepository;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.auth.dto.AuthorManageDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import nuri.foundation.core.exception.BusinessException;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthorManageService 단위 테스트")
class AuthorManageServiceTest {

    @BeforeEach
    void authenticateAdmin() {
        SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("admin","ESNTL_ADMIN","ROLE_ADMIN"));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Mock
    private AuthorityRepository authorityRepository;

    @InjectMocks
    private AuthorManageService authorManageService;

    @Test
    @DisplayName("권한 목록 조회 테스트")
    void selectAuthorListTest() {
        BaseSearchDto searchVO = new BaseSearchDto();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);
        
        Page<Authority> page = new PageImpl<>(List.of(Authority.builder().authrtCd("ROLE_ADMIN").authrtNm("관리자").build()));
        given(authorityRepository.searchAuthorities(any(), any(), any(Pageable.class))).willReturn(page);

        Page<AuthorManageDto> result = authorManageService.selectAuthorList(searchVO);

        // 내용과 총건수가 같은 질의에서 나온다. 검색을 무시하던 findAll 로 되돌아가면 red 다.
        assertEquals(1, result.getContent().size());
        assertEquals("ROLE_ADMIN", result.getContent().get(0).getAuthrtCd());
        verify(authorityRepository, never()).findAll(any(Pageable.class));
    }

    @Test
    @DisplayName("권한 상세 조회 테스트")
    void selectAuthorTest() {
        Authority authority = Authority.builder().authrtCd("ROLE_ADMIN").authrtNm("관리자").build();
        given(authorityRepository.findById("ROLE_ADMIN")).willReturn(Optional.of(authority));

        AuthorManageDto result = authorManageService.selectAuthor("ROLE_ADMIN");

        assertNotNull(result);
        assertEquals("ROLE_ADMIN", result.getAuthrtCd());
    }

    @Test
    @DisplayName("권한 상세 미존재는 404 도메인 오류")
    void selectAuthorNotFound() {
        given(authorityRepository.findById("MISSING")).willReturn(Optional.empty());

        BusinessException error = assertThrows(BusinessException.class,
                () -> authorManageService.selectAuthor("MISSING"));

        assertEquals(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND,
                error.getErrorCode());
    }

    @Test
    @DisplayName("목록 조회: 1-based pageIndex 변환·기본 페이지 크기·정렬이 함께 적용된다")
    void listAppliesPagingAndSort() {
        BaseSearchDto vo = new BaseSearchDto();
        vo.setPageIndex(3);
        vo.setPageUnit(0);
        given(authorityRepository.searchAuthorities(any(), any(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of()));

        vo.setSearchKeyword("관리자");
        authorManageService.selectAuthorList(vo);

        org.mockito.ArgumentCaptor<Pageable> captor = org.mockito.ArgumentCaptor.forClass(Pageable.class);
        org.mockito.ArgumentCaptor<String> keyword = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.ArgumentCaptor<String> condition = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(authorityRepository).searchAuthorities(condition.capture(), keyword.capture(), captor.capture());
        /*
         * searchCondition 을 any() 로 흘려보내면 이 축의 함정을 구조적으로 못 잡는다.
         *
         * 화면(SecurityHubClient)의 권한 질의는 searchCondition 을 싣지 않고, BaseSearchDto 의
         * 기본값은 null 이 아니라 빈 문자열이다 — 이 값이 저장소로 흘러 "1" 게이트에 걸리지
         * 못하면서 검색어가 통째로 버려지던 실제 경로다. 그래서 여기서는 값을 지어내지 않는지만
         * 고정하고, 그 상태에서도 키워드가 필터로 걸리는지는
         * AuthorityRepositorySearchTest 가 실제 질의로 검증한다.
         */
        assertEquals("", condition.getValue(), "화면이 안 보내는 값을 서비스가 지어내면 안 된다");
        Pageable p = captor.getValue();
        assertEquals(2, p.getPageNumber(), "1-based 3페이지는 0-based 2");
        assertEquals(10, p.getPageSize(), "pageUnit 0 이면 기본 10");
        assertNotNull(p.getSort().getOrderFor("authrtCd"), "권한코드 정렬이 유지돼야 한다");
        // 검색어를 저장소로 전달하지 않으면 화면에서 검색이 통째로 무시된다.
        assertEquals("관리자", keyword.getValue());
    }

    @Test
    @DisplayName("총건수는 목록과 같은 질의에서 나온다 — 조건 없는 count 로 되돌아가면 어긋난다")
    void totalCountComesFromTheSameQuery() {
        // 스텁 인자를 먼저 만든다 — given(...) 과 willReturn(...) 사이에서 객체를 조립하면
        // Mockito 가 스터빙이 끝나지 않은 것으로 보고 UnfinishedStubbingException 을 낸다(실측).
        Page<Authority> page = new PageImpl<>(
                List.of(Authority.builder().authrtCd("ROLE_ADMIN").authrtNm("관리자").build()),
                org.springframework.data.domain.PageRequest.of(0, 10), 42);
        given(authorityRepository.searchAuthorities(any(), any(), any(Pageable.class))).willReturn(page);

        BaseSearchDto vo = new BaseSearchDto();
        vo.setSearchKeyword("관리자");

        assertEquals(42, authorManageService.selectAuthorList(vo).getTotalElements());
        verify(authorityRepository, never()).count();
    }

    @Test
    @DisplayName("생성일 표기: 8자리 숫자만 하이픈으로 재조립하고 나머지는 손대지 않는다")
    void createdDateIsNormalizedOnlyForCompactEightDigits() {
        // ① 8자리·하이픈 없음 → 재조립.
        assertEquals("2026-08-09", dtoOf("20260809").getAuthrtCrtYmd());
        // ② 이미 하이픈이 있으면 그대로 (조건을 뒤집으면 substring 이 문자열을 망가뜨린다).
        assertEquals("2026-08-09", dtoOf("2026-08-09").getAuthrtCrtYmd());
        // ③ 길이가 8이 아니면 그대로 — `== 8` 을 뒤집은 뮤턴트가 여기서 죽는다.
        assertEquals("202608", dtoOf("202608").getAuthrtCrtYmd());
        // ④ null 은 null (앞단 null 가드를 뒤집으면 NPE 로 죽는다).
        assertNull(dtoOf(null).getAuthrtCrtYmd());
        // ⑤ 앞뒤 공백은 제거된 뒤 판정된다.
        assertEquals("2026-08-09", dtoOf("  20260809  ").getAuthrtCrtYmd());
    }
    private AuthorManageDto dtoOf(String createdDate) {
        Authority entity = Authority.createRaw("ROLE_X", "이름", "설명", createdDate);
        given(authorityRepository.findById("ROLE_X")).willReturn(Optional.of(entity));
        return authorManageService.selectAuthor("ROLE_X");
    }

    @Test
    void legacyUnversionedWritesAreRetiredWithoutRepositoryMutation() {
        var dto=AuthorManageDto.builder().authrtCd("CUSTOM").authrtNm("그룹").build();
        java.util.List<Runnable> calls=java.util.List.of(() -> authorManageService.insertAuthor(dto),
            () -> authorManageService.updateAuthor(dto),()->authorManageService.deleteAuthor("CUSTOM"),
            () -> authorManageService.deleteAuthors(new String[]{"CUSTOM"}));
        for(var call:calls) assertThatThrownBy(call::run).isInstanceOfSatisfying(BusinessException.class,
            error -> assertEquals(nuri.foundation.core.exception.CommonErrorCode.AUTHORIZATION_ENDPOINT_RETIRED,error.getErrorCode()));
        verifyNoInteractions(authorityRepository);
    }
}
