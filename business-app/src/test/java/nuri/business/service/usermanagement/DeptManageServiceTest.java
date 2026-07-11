package nuri.business.service.usermanagement;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.user.entity.DeptManage;
import nuri.business.domain.user.repository.DeptManageRepository;
import nuri.business.service.usermanagement.dto.DeptManageDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
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

    @InjectMocks
    private DeptManageServiceImpl deptManageService;

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
}
