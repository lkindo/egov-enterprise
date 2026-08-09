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
                .scrtyDcsnTrgtId("USER1")
                .authrtId("ROLE_ADMIN")
                .build();
        
        given(userAuthorityRepository.findAllById(anyList())).willReturn(List.of());

        userAuthorityManageService.saveUserAuthorities(List.of(dto));

        verify(userAuthorityRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("사용자의 권한 정보 저장 테스트 - 기존 수정")
    void saveUserAuthoritiesUpdateTest() {
        UserAuthorityDto dto = UserAuthorityDto.builder()
                .scrtyDcsnTrgtId("USER1")
                .authrtId("ROLE_USER")
                .build();
        
        UserAuthority existing = mock(UserAuthority.class);
        given(existing.getScrtyDcsnTrgtId()).willReturn("USER1");
        given(userAuthorityRepository.findAllById(anyList())).willReturn(List.of(existing));

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
        request.setAuthrtId("ROLE_DEPT");
        request.setAllMembers(true);
        
        User user = mock(User.class);
        given(user.getEsntlId()).willReturn("USER1");
        given(userRepository.findByOgnzId("DEPT1")).willReturn(List.of(user));
        given(userAuthorityRepository.findAllById(anyList())).willReturn(List.of());

        userAuthorityManageService.saveDeptAuthorities(request);

        verify(userAuthorityRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("부서별 권한 일괄 저장 테스트 - 특정 멤버")
    void saveDeptAuthoritiesSpecificMembersTest() {
        DeptAuthorBatchRequest request = new DeptAuthorBatchRequest();
        request.setDeptId("DEPT1");
        request.setAuthrtId("ROLE_DEPT");
        request.setAllMembers(false);
        request.setUserIds(List.of("USER1"));
        
        given(userAuthorityRepository.findAllById(anyList())).willReturn(List.of());

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
            userAuthorityManageService.saveDeptAuthorities(new DeptAuthorBatchRequest());
        });
    }

    @Test
    @DisplayName("사용자의 권한 정보 저장 테스트 - 필터링")
    void saveUserAuthoritiesFilterTest() {
        UserAuthorityDto dto1 = mock(UserAuthorityDto.class);
        lenient().when(dto1.getScrtyDcsnTrgtId()).thenReturn(null);
        lenient().when(dto1.getAuthrtId()).thenReturn("ROLE_USER");

        UserAuthorityDto dto2 = mock(UserAuthorityDto.class);
        lenient().when(dto2.getScrtyDcsnTrgtId()).thenReturn("USER1");
        lenient().when(dto2.getAuthrtId()).thenReturn(null);
        
        userAuthorityManageService.saveUserAuthorities(List.of(dto1, dto2));

        verify(userAuthorityRepository).saveAll(argThat(l -> l != null && !l.iterator().hasNext()));
    }

    @Test
    @DisplayName("부서별 권한 일괄 저장 테스트 - 빈 사용자 목록")
    void saveDeptAuthoritiesEmptyUsersTest() {
        DeptAuthorBatchRequest request = new DeptAuthorBatchRequest();
        request.setDeptId("DEPT1");
        request.setAuthrtId("ROLE_DEPT");
        request.setAllMembers(false);
        request.setUserIds(List.of());

        userAuthorityManageService.saveDeptAuthorities(request);

        verify(userAuthorityRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("부서별 권한 일괄 저장 테스트 - 기존 수정")
    void saveDeptAuthoritiesUpdateTest() {
        DeptAuthorBatchRequest request = new DeptAuthorBatchRequest();
        request.setDeptId("DEPT1");
        request.setAuthrtId("ROLE_DEPT");
        request.setUserIds(List.of("USER1"));
        
        UserAuthority existing = mock(UserAuthority.class);
        given(existing.getScrtyDcsnTrgtId()).willReturn("USER1");
        given(userAuthorityRepository.findAllById(anyList())).willReturn(List.of(existing));

        userAuthorityManageService.saveDeptAuthorities(request);

        verify(existing).update(eq("ROLE_DEPT"), isNull());
        verify(userAuthorityRepository).saveAll(anyList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강] PIT 이 이 클래스에서 16개를 살려 보냈다.
    //   그중 8개가 selectUserAuthorityList / selectDeptAuthorityList 의 **페이징 계산**이다
    //   (selectDeptAuthorityList 는 통째로 NO_COVERAGE 였다).
    //
    //   ⚠ 이 페이징 계산은 이 코드베이스에 **13개소·10개 파일로 복제**돼 있다.
    //   호출부마다 검증을 붙이지 않으면 뮤턴트가 계속 살아남는다 —
    //   근본적으로는 공통 헬퍼 추출 후보다(프로덕션 변경이라 별건).
    // ─────────────────────────────────────────────────────────────────────────

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

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강 2차] 저장 경로에 8개가 남아 있었다.
    //   공통 원인은 **기존 엔티티가 있는 경로(update)를 한 번도 태우지 않은 것**이다.
    //   findAllById 가 항상 빈 목록을 돌려주도록 스텁돼 있어서, "이미 권한이 있는 사용자를
    //   갱신" 하는 분기가 통째로 비어 있었다 — 실제 운용에서 더 흔한 쪽이 그쪽이다.
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("사용자 권한 저장: 기존 권한이 있으면 새로 만들지 않고 갱신한다")
    @SuppressWarnings("unchecked")
    void saveUserAuthoritiesUpdatesExistingInsteadOfInserting() {
        UserAuthority existing = UserAuthority.builder()
                .scrtyDcsnTrgtId("U1").authrtId("ROLE_OLD").mbrTypeCd("01").build();
        given(userAuthorityRepository.findAllById(anyIterable())).willReturn(List.of(existing));

        UserAuthorityDto dto = new UserAuthorityDto();
        dto.setScrtyDcsnTrgtId("U1");
        dto.setAuthrtId("ROLE_NEW");
        dto.setMbrTypeCd("02");
        userAuthorityManageService.saveUserAuthorities(List.of(dto));

        ArgumentCaptor<List<UserAuthority>> saved = ArgumentCaptor.forClass(List.class);
        verify(userAuthorityRepository).saveAll(saved.capture());
        assertEquals(1, saved.getValue().size());
        // 같은 인스턴스여야 한다 — 새 엔티티를 만들면 PK 충돌이거나 중복 행이 된다.
        assertSame(existing, saved.getValue().get(0));
        assertEquals("ROLE_NEW", existing.getAuthrtId(), "권한이 실제로 갱신돼야 한다");
        assertEquals("02", existing.getMbrTypeCd());
    }

    @Test
    @DisplayName("사용자 권한 저장: 기존 권한이 없으면 새 엔티티를 만든다")
    @SuppressWarnings("unchecked")
    void saveUserAuthoritiesCreatesWhenAbsent() {
        given(userAuthorityRepository.findAllById(anyIterable())).willReturn(List.of());

        UserAuthorityDto dto = new UserAuthorityDto();
        dto.setScrtyDcsnTrgtId("U2");
        dto.setAuthrtId("ROLE_NEW");
        dto.setMbrTypeCd("01");
        userAuthorityManageService.saveUserAuthorities(List.of(dto));

        ArgumentCaptor<List<UserAuthority>> saved = ArgumentCaptor.forClass(List.class);
        verify(userAuthorityRepository).saveAll(saved.capture());
        // `replaced return value with null` 뮤턴트는 여기서 NPE 로 죽는다.
        UserAuthority created = saved.getValue().get(0);
        assertNotNull(created);
        assertEquals("U2", created.getScrtyDcsnTrgtId());
        assertEquals("ROLE_NEW", created.getAuthrtId());
    }

    @Test
    @DisplayName("사용자 권한 저장: 조회 대상 ID 를 정확히 전달한다 (배치 조회 키)")
    @SuppressWarnings("unchecked")
    void saveUserAuthoritiesPassesExactIdsToBatchLookup() {
        given(userAuthorityRepository.findAllById(anyIterable())).willReturn(List.of());

        UserAuthorityDto a = new UserAuthorityDto();
        a.setScrtyDcsnTrgtId("U1");
        a.setAuthrtId("R");
        UserAuthorityDto b = new UserAuthorityDto();
        b.setScrtyDcsnTrgtId("U2");
        b.setAuthrtId("R");
        userAuthorityManageService.saveUserAuthorities(List.of(a, b));

        ArgumentCaptor<Iterable<String>> ids = ArgumentCaptor.forClass(Iterable.class);
        verify(userAuthorityRepository).findAllById(ids.capture());
        // ID 추출 람다가 ""(빈 문자열)를 돌려주는 뮤턴트는 여기서 죽는다.
        // 빈 키로 조회하면 기존 권한을 못 찾아 **전부 새 엔티티로 덮어쓴다**.
        assertEquals(List.of("U1", "U2"), ids.getValue());
    }

    @Test
    @DisplayName("부서 권한 저장: 부서 전체 지정이면 소속 사용자의 esntlId 로 조회한다")
    @SuppressWarnings("unchecked")
    void saveDeptAuthoritiesResolvesAllMembersByEsntlId() {
        User u1 = User.builder().esntlId("E1").userId("u1").userNm("갑").build();
        User u2 = User.builder().esntlId("E2").userId("u2").userNm("을").build();
        given(userRepository.findByOgnzId("D1")).willReturn(List.of(u1, u2));
        given(userAuthorityRepository.findAllById(anyIterable())).willReturn(List.of());

        DeptAuthorBatchRequest req = new DeptAuthorBatchRequest();
        req.setDeptId("D1");
        req.setAuthrtId("ROLE_DEPT");
        req.setAllMembers(true);
        userAuthorityManageService.saveDeptAuthorities(req);

        ArgumentCaptor<Iterable<String>> ids = ArgumentCaptor.forClass(Iterable.class);
        verify(userAuthorityRepository).findAllById(ids.capture());
        // esntlId 추출 람다가 "" 를 돌려주는 뮤턴트는 여기서 죽는다.
        assertEquals(List.of("E1", "E2"), ids.getValue());
    }

    @Test
    @DisplayName("부서 권한 저장: 기존 권한이 있으면 갱신하고, 없으면 생성한다")
    @SuppressWarnings("unchecked")
    void saveDeptAuthoritiesUpdatesExistingAndCreatesMissing() {
        UserAuthority existing = UserAuthority.builder()
                .scrtyDcsnTrgtId("E1").authrtId("ROLE_OLD").mbrTypeCd("01").build();
        given(userAuthorityRepository.findAllById(anyIterable())).willReturn(List.of(existing));

        DeptAuthorBatchRequest req = new DeptAuthorBatchRequest();
        req.setDeptId("D1");
        req.setAuthrtId("ROLE_DEPT");
        req.setAllMembers(false);
        req.setUserIds(List.of("E1", "E2"));
        userAuthorityManageService.saveDeptAuthorities(req);

        ArgumentCaptor<List<UserAuthority>> saved = ArgumentCaptor.forClass(List.class);
        verify(userAuthorityRepository).saveAll(saved.capture());
        assertEquals(2, saved.getValue().size());
        // 기존 항목은 같은 인스턴스로 갱신 — 새로 만들면 중복 행이 된다.
        assertSame(existing, saved.getValue().get(0));
        assertEquals("ROLE_DEPT", existing.getAuthrtId());
        // 신규 항목은 새 엔티티 — null 반환 뮤턴트는 여기서 죽는다.
        assertNotNull(saved.getValue().get(1));
        assertEquals("E2", saved.getValue().get(1).getScrtyDcsnTrgtId());
        assertEquals("ROLE_DEPT", saved.getValue().get(1).getAuthrtId());
    }
}
