package nuri.business.service.deptjob;

import nuri.business.domain.deptjob.DeptJobBox;
import nuri.business.domain.deptjob.DeptJobBoxRepository;
import nuri.business.service.deptjob.dto.DeptJobBoxDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DeptJobBoxService 단위 테스트")
class DeptJobBoxServiceTest {

    @Mock
    private DeptJobBoxRepository deptJobBoxRepository;

    @InjectMocks
    private DeptJobBoxService deptJobBoxService;

    private DeptJobBox deptJobBox;

    @BeforeEach
    void setUp() {
        deptJobBox = DeptJobBox.builder()
                .deptTaskBoxId("BOX1")
                .deptTaskBoxNm("Test Box")
                .deptId("DEPT1")
                .sortOrdr(1L)
                .build();
    }

    @Test
    @DisplayName("부서함 목록 조회 - 키워드")
    void getDeptJobBoxList() {
        Page<DeptJobBox> page = new PageImpl<>(Collections.singletonList(deptJobBox), PageRequest.of(0, 10), 1);
        when(deptJobBoxRepository.findByKeyword(anyString(), any(PageRequest.class))).thenReturn(page);

        Page<DeptJobBoxDto> result = deptJobBoxService.getDeptJobBoxList("keyword", PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals("BOX1", result.getContent().get(0).getDeptTaskBoxId());
    }

    @Test
    @DisplayName("부서함 목록 조회 - 부서ID")
    void getDeptJobBoxListByDept() {
        Page<DeptJobBox> page = new PageImpl<>(Collections.singletonList(deptJobBox), PageRequest.of(0, 10), 1);
        when(deptJobBoxRepository.findByDeptId(anyString(), any(PageRequest.class))).thenReturn(page);

        Page<DeptJobBoxDto> result = deptJobBoxService.getDeptJobBoxListByDept("DEPT1", PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals("BOX1", result.getContent().get(0).getDeptTaskBoxId());
    }

    @Test
    @DisplayName("부서함 상세 조회")
    void getDeptJobBox() {
        when(deptJobBoxRepository.findById("BOX1")).thenReturn(Optional.of(deptJobBox));

        DeptJobBoxDto result = deptJobBoxService.getDeptJobBox("BOX1");

        assertNotNull(result);
        assertEquals("BOX1", result.getDeptTaskBoxId());
    }

    @Test
    @DisplayName("부서함 상세 조회 - 없음")
    void getDeptJobBox_NotFound() {
        when(deptJobBoxRepository.findById("BOX99")).thenReturn(Optional.empty());

        DeptJobBoxDto result = deptJobBoxService.getDeptJobBox("BOX99");

        assertNull(result);
    }

    @Test
    @DisplayName("부서함 생성")
    void createDeptJobBox() {
        DeptJobBoxDto dto = new DeptJobBoxDto();
        dto.setDeptTaskBoxNm("New Box");
        dto.setDeptId("DEPT2");
        dto.setSortOrdr(2L);

        when(deptJobBoxRepository.save(any(DeptJobBox.class))).thenReturn(deptJobBox);

        String id = deptJobBoxService.createDeptJobBox("user1", dto);

        assertNotNull(id);
        assertTrue(id.startsWith("DEPTJOB_"));
    }

    @Test
    @DisplayName("부서함 수정")
    void updateDeptJobBox() {
        when(deptJobBoxRepository.findById("BOX1")).thenReturn(Optional.of(deptJobBox));

        DeptJobBoxDto dto = new DeptJobBoxDto();
        dto.setDeptTaskBoxNm("Updated Box");
        dto.setDeptId("DEPT1");
        dto.setSortOrdr(2L);

        deptJobBoxService.updateDeptJobBox("BOX1", "user1", dto);

        assertEquals("Updated Box", deptJobBox.getDeptTaskBoxNm());
    }

    @Test
    @DisplayName("부서함 수정 - 존재하지 않음")
    void updateDeptJobBox_NotFound() {
        when(deptJobBoxRepository.findById("BOX99")).thenReturn(Optional.empty());

        DeptJobBoxDto dto = new DeptJobBoxDto();

        assertThrows(IllegalArgumentException.class, () -> deptJobBoxService.updateDeptJobBox("BOX99", "user1", dto));
    }

    @Test
    @DisplayName("부서함 삭제")
    void deleteDeptJobBox() {
        doNothing().when(deptJobBoxRepository).deleteById("BOX1");

        deptJobBoxService.deleteDeptJobBox("BOX1");

        verify(deptJobBoxRepository, times(1)).deleteById("BOX1");
    }
}
