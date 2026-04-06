package nuri.foundation.service.usermanagement;

import nuri.foundation.domain.user.entity.DeptManage;
import nuri.foundation.domain.user.repository.DeptManageRepository;
import nuri.foundation.service.usermanagement.dto.DeptManageDto;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("DeptManageServiceImpl 단위 테스트")
class DeptManageServiceImplTest {

    @InjectMocks
    private DeptManageServiceImpl deptManageService;

    @Mock
    private DeptManageRepository deptManageRepository;

    @Test
    @DisplayName("부서 목록 조회")
    void getDeptManageList() {
        Pageable pageable = PageRequest.of(0, 10);
        DeptManage entity = DeptManage.builder().orgnztId("OR_01").orgnztNm("Dept").build();
        given(deptManageRepository.searchDeptManages(any(), eq(pageable))).willReturn(new PageImpl<>(List.of(entity)));

        Page<DeptManageDto> result = deptManageService.getDeptManageList(null, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getOrgnztId()).isEqualTo("OR_01");
    }

    @Test
    @DisplayName("부서 상세 조회 - 성공")
    void getDeptManage_Success() {
        DeptManage entity = DeptManage.builder().orgnztId("OR_01").orgnztNm("Dept").build();
        given(deptManageRepository.findById("OR_01")).willReturn(Optional.of(entity));

        DeptManageDto result = deptManageService.getDeptManage("OR_01");

        assertThat(result.getOrgnztId()).isEqualTo("OR_01");
    }

    @Test
    @DisplayName("부서 등록")
    void insertDeptManage() {
        DeptManageDto dto = DeptManageDto.builder().orgnztId("OR_01").orgnztNm("New").build();
        deptManageService.insertDeptManage(dto);
        verify(deptManageRepository).save(any(DeptManage.class));
    }

    @Test
    @DisplayName("부서 수정 - 성공")
    void updateDeptManage_Success() {
        DeptManage entity = DeptManage.builder().orgnztId("OR_01").orgnztNm("Old").build();
        given(deptManageRepository.findById("OR_01")).willReturn(Optional.of(entity));

        DeptManageDto dto = DeptManageDto.builder().orgnztId("OR_01").orgnztNm("New").build();
        deptManageService.updateDeptManage(dto);

        assertThat(entity.getOrgnztNm()).isEqualTo("New");
    }

    @Test
    @DisplayName("부서 삭제")
    void deleteDeptManage() {
        deptManageService.deleteDeptManage("OR_01");
        verify(deptManageRepository).deleteById("OR_01");
    }
}
