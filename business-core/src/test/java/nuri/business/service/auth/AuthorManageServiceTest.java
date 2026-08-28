package nuri.business.service.auth;

import nuri.business.domain.auth.Authority;
import nuri.business.domain.auth.AuthorityRepository;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.auth.dto.AuthorManageDto;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthorManageService 단위 테스트")
class AuthorManageServiceTest {

    @Mock
    private AuthorityRepository authorityRepository;

    @Mock
    private nuri.business.domain.auth.AuthorityRoleRepository authorityRoleRepository;

    @Mock
    private nuri.business.domain.auth.MenuAuthorityRepository menuAuthorityRepository;

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
    @DisplayName("권한 등록 테스트")
    void insertAuthorTest() {
        AuthorManageDto dto = AuthorManageDto.builder()
                .authrtCd("ROLE_NEW")
                .authrtNm("신규권한")
                .build();
        
        authorManageService.insertAuthor(dto);

        verify(authorityRepository).save(any());
    }

    @Test
    @DisplayName("권한 수정 테스트")
    void updateAuthorTest() {
        AuthorManageDto dto = AuthorManageDto.builder()
                .authrtCd("ROLE_EXIST")
                .authrtNm("수정된이름")
                .build();
        
        Authority authority = mock(Authority.class);
        given(authorityRepository.findById("ROLE_EXIST")).willReturn(Optional.of(authority));

        authorManageService.updateAuthor(dto);

        verify(authority).update(eq("수정된이름"), any());
    }

    @Test
    @DisplayName("권한 삭제 테스트")
    void deleteAuthorTest() {
        authorManageService.deleteAuthor("ROLE_ADMIN");
        verify(authorityRepository).deleteById("ROLE_ADMIN");
    }

    @Test
    @DisplayName("권한 일괄 삭제 테스트")
    void deleteAuthorsTest() {
        String[] codes = {"ROLE_1", "ROLE_2"};
        authorManageService.deleteAuthors(codes);
        verify(authorityRepository).deleteAllById(anyList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강] PIT 이 이 클래스에서 12개를 살려 보냈다.
    //
    //   그중 4개가 **삭제 시 매핑 선정리**(deleteAuthor·deleteAuthors)다.
    //   authorityRoleRepository / menuAuthorityRepository 삭제 호출을 지워도 그린이었다 —
    //   즉 "권한을 지웠는데 tb_authrt_role_map·tb_menu_crt_dtl 의 매핑이 남는" 회귀를
    //   테스트가 감지하지 못한다. FK(NO ACTION) 때문에 삭제가 실패하거나,
    //   최악의 경우 **삭제된 권한의 메뉴 접근 매핑이 잔존**한다.
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("삭제: 권한보다 먼저 역할·메뉴 매핑을 정리한다 (FK NO ACTION 통과 조건)")
    void deleteAuthorClearsMappingsBeforeAuthority() {
        authorManageService.deleteAuthor("ROLE_TEMP");

        // 호출 하나라도 지운 뮤턴트가 여기서 죽는다.
        org.mockito.InOrder order = inOrder(authorityRoleRepository, menuAuthorityRepository, authorityRepository);
        order.verify(authorityRoleRepository).deleteByIdAuthrtCd("ROLE_TEMP");
        order.verify(menuAuthorityRepository).deleteByIdAuthrtCd("ROLE_TEMP");
        order.verify(authorityRepository).deleteById("ROLE_TEMP");
    }

    @Test
    @DisplayName("일괄 삭제: 대상마다 매핑을 정리한 뒤 한 번에 삭제한다")
    void deleteAuthorsClearsMappingsForEveryTarget() {
        authorManageService.deleteAuthors(new String[] { "R1", "R2" });

        for (String cd : new String[] { "R1", "R2" }) {
            verify(authorityRoleRepository).deleteByIdAuthrtCd(cd);
            verify(menuAuthorityRepository).deleteByIdAuthrtCd(cd);
        }
        verify(authorityRepository).deleteAllById(List.of("R1", "R2"));
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
    @DisplayName("수정: 대상 권한이 없으면 예외로 끝난다 (조용한 무시 아님)")
    void updateThrowsWhenAuthorityMissing() {
        given(authorityRepository.findById("GHOST")).willReturn(Optional.empty());
        // authrtNm 은 @NonNull — 빌더가 먼저 NPE 를 내면 서비스에 닿지도 못한다.
        AuthorManageDto dto = AuthorManageDto.builder().authrtCd("GHOST").authrtNm("이름").build();

        // orElseThrow 람다의 `replaced return value with null` 뮤턴트가 여기서 죽는다.
        assertThrows(nuri.foundation.core.exception.BusinessException.class,
                () -> authorManageService.updateAuthor(dto));
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

    /** toDto 는 private 이므로 목록 조회 경로로 간접 호출한다. */
    private AuthorManageDto dtoOf(String crtYmd) {
        // createRaw 는 null 을 defaultDate() 로 대체하지 않고 원본을 그대로 보존한다.
        Authority entity = Authority.createRaw("ROLE_X", "이름", "설명", crtYmd);
        given(authorityRepository.findById("ROLE_X")).willReturn(Optional.of(entity));
        return authorManageService.selectAuthor("ROLE_X");
    }
}
