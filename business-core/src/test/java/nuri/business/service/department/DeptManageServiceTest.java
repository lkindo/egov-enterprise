package nuri.business.service.department;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.user.entity.DeptManage;
import nuri.business.domain.user.repository.DeptManageRepository;
import nuri.business.service.department.dto.DeptManageDto;
import nuri.business.service.department.dto.DeptManageMapper;
import nuri.business.service.department.dto.DeptManageMapperImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DeptManageService 단위 테스트")
class DeptManageServiceTest {

    /** 쓰기 서비스는 현재 권한을 다시 본다(백엔드 헌법 제8조). 권한을 따로 쥐지 않은 시험은 관리자로 돈다. */
    @org.junit.jupiter.api.BeforeEach
    void authorizeServiceGuard() {
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
    }

    @org.junit.jupiter.api.AfterEach
    void clearServiceGuard() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @Mock
    private DeptManageRepository deptManageRepository;

    @Mock
    private nuri.business.domain.user.repository.UserRepository userRepository;

    // 실제 MapStruct 생성 구현(DeptManageMapperImpl)을 spy 로 주입 — 수기 from() 과 동일 매핑 거동 보장
    @Spy
    private DeptManageMapper deptManageMapper = new DeptManageMapperImpl();

    @InjectMocks
    private DeptManageService deptManageService;

    @Test
    @DisplayName("부서 목록 조회 테스트")
    void getDeptManageListTest() {
        Page<DeptManage> page = new PageImpl<>(List.of(
                DeptManage.builder().ognzId("DEPT1").ognzNm("부서1").build()
        ));
        given(deptManageRepository.searchDeptManages(anyString(), any(Pageable.class))).willReturn(page);

        Page<DeptManageDto> result = deptManageService.getDeptManageList("부서", PageRequest.of(0, 10));

        assertEquals(1, result.getContent().size());
        assertEquals("DEPT1", result.getContent().get(0).getOgnzId());
    }

    @Test
    @DisplayName("부서 상세 조회 테스트 - 성공")
    void getDeptManageSuccessTest() {
        DeptManage entity = DeptManage.builder().ognzId("DEPT1").ognzNm("부서1").build();
        given(deptManageRepository.findById("DEPT1")).willReturn(Optional.of(entity));

        DeptManageDto result = deptManageService.getDeptManage("DEPT1");

        assertNotNull(result);
        assertEquals("DEPT1", result.getOgnzId());
    }

    @Test
    @DisplayName("부서 상세 조회 테스트 - 실패")
    void getDeptManageFailTest() {
        given(deptManageRepository.findById("UNKNOWN")).willReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> deptManageService.getDeptManage("UNKNOWN"));
    }

    @Test
    @DisplayName("부서 등록 테스트")
    void insertDeptManageTest() {
        DeptManageDto dto = DeptManageDto.builder()
                .ognzId("NEW1")
                .ognzNm("신규부서")
                .build();

        deptManageService.insertDeptManage(dto);

        verify(deptManageRepository).save(any());
    }

    /**
     * [2026-09-17] V2_26 은 컬럼 주석에 "NULL 이면 최상위(루트)" 라고 못박았지만 쓰기 경로는
     * 빈 문자열을 그대로 저장할 수 있었다. 빈 문자열은 NULL 이 아니므로 V2_102 의
     * {@code fk_tb_ognz_info_up_ognz_id} 가 그것을 거부한다.
     */
    @Test
    @DisplayName("부서 등록 - 최상위(빈 문자열 상위)는 NULL 로 저장한다")
    void insertDeptManage_storesBlankParentAsNull() {
        DeptManageDto dto = DeptManageDto.builder()
                .ognzNm("최상위부서")
                .upOgnzId("")
                .build();

        deptManageService.insertDeptManage(dto);

        org.mockito.ArgumentCaptor<DeptManage> saved =
                org.mockito.ArgumentCaptor.forClass(DeptManage.class);
        verify(deptManageRepository).save(saved.capture());
        org.assertj.core.api.Assertions.assertThat(saved.getValue().getUpOgnzId()).isNull();
    }

    @Test
    @DisplayName("순서를 정하지 않은 새 부서는 같은 상위 아래 형제의 맨 뒤에 둔다 (DIP C5)")
    void insertDeptManage_placesNewDeptLastAmongSiblings() {
        // 종전에는 0 으로 저장돼 정렬 순서로 읽는 목록에서 형제의 맨 앞으로 끼어들었다.
        // ID 채번도 existsById 를 부르므로 상위(PARENT)만 있다고 답한다.
        given(deptManageRepository.existsById(org.mockito.ArgumentMatchers.anyString()))
                .willAnswer(invocation -> "PARENT".equals(invocation.getArgument(0)));
        given(deptManageRepository.findMaxSortOrdrUnder("PARENT")).willReturn(4);
        given(deptManageRepository.findMaxSortOrdrOfRoots()).willReturn(2);
        org.mockito.ArgumentCaptor<DeptManage> saved = org.mockito.ArgumentCaptor.forClass(DeptManage.class);

        deptManageService.insertDeptManage(DeptManageDto.builder().ognzNm("하위").upOgnzId("PARENT").build());
        deptManageService.insertDeptManage(DeptManageDto.builder().ognzNm("최상위").sortOrdr(0).build());
        deptManageService.insertDeptManage(DeptManageDto.builder().ognzNm("지정").upOgnzId("PARENT").sortOrdr(2).build());

        verify(deptManageRepository, org.mockito.Mockito.times(3)).save(saved.capture());
        org.assertj.core.api.Assertions.assertThat(saved.getAllValues())
                .extracting(DeptManage::getSortOrdr)
                .containsExactly(5, 3, 2);
    }

    @Test
    @DisplayName("부서 수정 테스트")
    void updateDeptManageTest() {
        DeptManageDto dto = DeptManageDto.builder()
                .ognzId("DEPT1")
                .ognzNm("수정부서")
                .build();
        
        DeptManage entity = mock(DeptManage.class);
        given(deptManageRepository.findByIdForUpdate("DEPT1")).willReturn(Optional.of(entity));

        deptManageService.updateDeptManage(dto);

        verify(entity).update(eq("수정부서"), any());
        verify(deptManageRepository, never()).findById(anyString());
    }

    @Test
    @DisplayName("부서 삭제 테스트")
    void deleteDeptManageTest() {
        deptManageService.deleteDeptManage("DEPT1");
        verify(deptManageRepository).deleteById("DEPT1");
    }

    @Test
    void emptyHierarchyDoesNotWrite() {
        deptManageService.updateDeptHierarchy(null);
        deptManageService.updateDeptHierarchy(List.of());
        verifyNoInteractions(deptManageRepository);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(booleans = {true, false})
    void refusesDeletionWhileMembersOrChildrenRemain(boolean members) {
        if (members) given(userRepository.countByOgnzId("D")).willReturn(1L);
        else given(deptManageRepository.countByUpOgnzId("D")).willReturn(1L);
        BusinessException failure = assertThrows(BusinessException.class, () -> deptManageService.deleteDeptManage("D"));
        assertEquals(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_IN_USE, failure.getErrorCode());
        verify(deptManageRepository, never()).deleteById(any());
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.NullAndEmptySource
    void rootHierarchyPreservesNameAndDefaultsOrder(String parent) {
        var entity = DeptManage.builder().ognzId("D").ognzNm("keep").build();
        givenHierarchy(List.of(entity));
        given(deptManageRepository.findById("D")).willReturn(Optional.of(entity));
        deptManageService.updateDeptHierarchy(List.of(DeptManageDto.builder().ognzId("D").upOgnzId(parent).ognzNm("forged").build()));
        assertEquals("keep", entity.getOgnzNm());
        assertEquals(0, entity.getSortOrdr());
    }

    @Test
    void missingAndSelfParentAreRejectedBeforeMutation() {
        var entity = DeptManage.builder().ognzId("D").build();
        givenHierarchy(List.of(entity));
        for (String parent : List.of("D", "missing")) {
            assertThrows(BusinessException.class, () -> deptManageService.updateDeptHierarchy(
                    List.of(DeptManageDto.builder().ognzId("D").upOgnzId(parent).build())));
            assertNull(entity.getUpOgnzId());
        }
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(booleans = {true, false})
    void rejectsCycleThroughSelfOrExistingAncestor(boolean throughSelf) {
        var entity = DeptManage.builder().ognzId("D").build();
        givenHierarchy(List.of(entity, DeptManage.builder().ognzId("A").upOgnzId(throughSelf ? "D" : "A").build()));
        assertThrows(BusinessException.class, () -> deptManageService.updateDeptHierarchy(
                List.of(DeptManageDto.builder().ognzId("D").upOgnzId("A").build())));
        assertNull(entity.getUpOgnzId());
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(ints = {50, 51})
    void hierarchyDepthBoundary(int depth) {
        var entity = DeptManage.builder().ognzId("D").build();
        var hierarchy = new java.util.ArrayList<DeptManage>();
        hierarchy.add(entity);
        for (int i = 0; i < depth; i++) {
            hierarchy.add(DeptManage.builder().ognzId("A" + i)
                    .upOgnzId(i + 1 < depth ? "A" + (i + 1) : null).build());
        }
        givenHierarchy(hierarchy);
        var items = List.of(DeptManageDto.builder().ognzId("D").upOgnzId("A0").sortOrdr(3).build());
        if (depth == 50) {
            given(deptManageRepository.findById("D")).willReturn(Optional.of(entity));
            deptManageService.updateDeptHierarchy(items);
            assertEquals("A0", entity.getUpOgnzId());
            assertEquals(3, entity.getSortOrdr());
        } else {
            assertThrows(BusinessException.class, () -> deptManageService.updateDeptHierarchy(items));
            assertNull(entity.getUpOgnzId());
        }
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(booleans = {true, false})
    void validFinalHierarchyIsIndependentOfBatchOrder(boolean reverse) {
        var parent = DeptManage.builder().ognzId("P").ognzNm("parent").build();
        var child = DeptManage.builder().ognzId("C").upOgnzId("P").ognzNm("child").build();
        givenHierarchy(List.of(parent, child));
        given(deptManageRepository.findById("P")).willReturn(Optional.of(parent));
        given(deptManageRepository.findById("C")).willReturn(Optional.of(child));
        var parentMove = DeptManageDto.builder().ognzId("P").upOgnzId("C").sortOrdr(2).build();
        var childMove = DeptManageDto.builder().ognzId("C").upOgnzId(null).sortOrdr(1).build();

        deptManageService.updateDeptHierarchy(reverse ? List.of(childMove, parentMove) : List.of(parentMove, childMove));

        assertEquals("C", parent.getUpOgnzId());
        assertNull(child.getUpOgnzId());
        assertEquals("parent", parent.getOgnzNm());
        assertEquals("child", child.getOgnzNm());
    }

    @Test
    void rejectsFinalCycleBeforeChangingAnyEntity() {
        var first = DeptManage.builder().ognzId("A").build();
        var second = DeptManage.builder().ognzId("B").build();
        givenHierarchy(List.of(first, second));

        assertThrows(BusinessException.class, () -> deptManageService.updateDeptHierarchy(List.of(
                DeptManageDto.builder().ognzId("A").upOgnzId("B").build(),
                DeptManageDto.builder().ognzId("B").upOgnzId("A").build())));

        assertNull(first.getUpOgnzId());
        assertNull(second.getUpOgnzId());
        verify(deptManageRepository, never()).findById(anyString());
    }

    @Test
    void missingOrDuplicateDepartmentDoesNotChangeTheHierarchy() {
        givenHierarchy(List.of(DeptManage.builder().ognzId("D").build()));
        var existing = DeptManageDto.builder().ognzId("D").build();
        assertThrows(BusinessException.class, () -> deptManageService.updateDeptHierarchy(
                List.of(DeptManageDto.builder().ognzId("missing").build())));
        assertThrows(BusinessException.class, () -> deptManageService.updateDeptHierarchy(List.of(existing, existing)));
        verify(deptManageRepository, never()).findById(anyString());
    }

    private void givenHierarchy(List<DeptManage> departments) {
        List<DeptManageRepository.ParentLink> links = departments.stream()
                .map(department -> (DeptManageRepository.ParentLink) new DeptManageRepository.ParentLink() {
                    public String getOgnzId() { return department.getOgnzId(); }
                    public String getUpOgnzId() { return department.getUpOgnzId(); }
                }).toList();
        given(deptManageRepository.findParentLinksForUpdate()).willReturn(links);
    }
}
