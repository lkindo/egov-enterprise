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

    @Test
    @DisplayName("부서 수정 테스트")
    void updateDeptManageTest() {
        DeptManageDto dto = DeptManageDto.builder()
                .ognzId("DEPT1")
                .ognzNm("수정부서")
                .build();
        
        DeptManage entity = mock(DeptManage.class);
        given(deptManageRepository.findById("DEPT1")).willReturn(Optional.of(entity));

        deptManageService.updateDeptManage(dto);

        verify(entity).update(eq("수정부서"), any());
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
        given(deptManageRepository.findById("D")).willReturn(Optional.of(entity));
        deptManageService.updateDeptHierarchy(List.of(DeptManageDto.builder().ognzId("D").upOgnzId(parent).ognzNm("forged").build()));
        assertEquals("keep", entity.getOgnzNm());
        assertEquals(0, entity.getSortOrdr());
    }

    @Test
    void missingAndSelfParentAreRejectedBeforeMutation() {
        var entity = DeptManage.builder().ognzId("D").build();
        given(deptManageRepository.findById("D")).willReturn(Optional.of(entity));
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
        given(deptManageRepository.findById("D")).willReturn(Optional.of(entity));
        given(deptManageRepository.existsById("A")).willReturn(true);
        given(deptManageRepository.findById("A")).willReturn(Optional.of(DeptManage.builder().ognzId("A").upOgnzId(throughSelf ? "D" : "A").build()));
        assertThrows(BusinessException.class, () -> deptManageService.updateDeptHierarchy(
                List.of(DeptManageDto.builder().ognzId("D").upOgnzId("A").build())));
        assertNull(entity.getUpOgnzId());
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(ints = {50, 51})
    void hierarchyDepthBoundary(int depth) {
        var entity = DeptManage.builder().ognzId("D").build();
        given(deptManageRepository.findById("D")).willReturn(Optional.of(entity));
        given(deptManageRepository.existsById("A0")).willReturn(true);
        for (int i = 0; i < Math.min(depth, 50); i++) {
            given(deptManageRepository.findById("A" + i)).willReturn(Optional.of(
                    DeptManage.builder().ognzId("A" + i).upOgnzId(i + 1 < depth ? "A" + (i + 1) : null).build()));
        }
        var items = List.of(DeptManageDto.builder().ognzId("D").upOgnzId("A0").sortOrdr(3).build());
        if (depth == 50) {
            deptManageService.updateDeptHierarchy(items);
            assertEquals("A0", entity.getUpOgnzId());
            assertEquals(3, entity.getSortOrdr());
        } else {
            assertThrows(BusinessException.class, () -> deptManageService.updateDeptHierarchy(items));
            assertNull(entity.getUpOgnzId());
        }
    }
}
