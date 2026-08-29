package nuri.business.service.deptjob;

import nuri.business.domain.deptjob.DeptJobBox;
import nuri.business.domain.deptjob.DeptJobBoxRepository;
import nuri.business.service.deptjob.dto.DeptJobBoxDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DeptJobBoxService 단위 테스트")
class DeptJobBoxServiceTest {

    @Mock
    private DeptJobBoxRepository deptJobBoxRepository;

    @Mock
    private nuri.business.domain.deptjob.DeptJobRepository deptJobRepository;

    @InjectMocks
    private DeptJobBoxService deptJobBoxService;

    private DeptJobBox deptJobBox;

    @BeforeEach
    void setUp() {
        deptJobBox = DeptJobBox.builder()
                .deptTaskBoxSn(1L)
                .deptTaskBoxNm("Test Box")
                .deptId("DEPT1")
                .sortOrdr(1L)
                .build();
        // 쓰기 경로는 SecurityUtil.assertAdmin(ADMIN/SYSTEM) 2차 가드를 통과해야 하므로 ADMIN 컨텍스트를 심는다.
        setAuthorities("ROLE_ADMIN");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void setAuthorities(String authority) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("tester", "pw",
                        List.of(new SimpleGrantedAuthority(authority))));
    }

    @Test
    @DisplayName("부서함 목록 조회 - 키워드")
    void getDeptJobBoxList() {
        Page<DeptJobBox> page = new PageImpl<>(Collections.singletonList(deptJobBox), PageRequest.of(0, 10), 1);
        when(deptJobBoxRepository.findByKeyword(anyString(), any(PageRequest.class))).thenReturn(page);

        Page<DeptJobBoxDto> result = deptJobBoxService.getDeptJobBoxList("keyword", PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals(1L, result.getContent().get(0).getDeptTaskBoxSn());
    }

    @Test
    @DisplayName("부서함 목록 조회 - 부서ID")
    void getDeptJobBoxListByDept() {
        Page<DeptJobBox> page = new PageImpl<>(Collections.singletonList(deptJobBox), PageRequest.of(0, 10), 1);
        when(deptJobBoxRepository.findByDeptId(anyString(), any(PageRequest.class))).thenReturn(page);

        Page<DeptJobBoxDto> result = deptJobBoxService.getDeptJobBoxListByDept("DEPT1", PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals(1L, result.getContent().get(0).getDeptTaskBoxSn());
    }

    @Test
    @DisplayName("부서함 상세 조회")
    void getDeptJobBox() {
        when(deptJobBoxRepository.findById(1L)).thenReturn(Optional.of(deptJobBox));

        DeptJobBoxDto result = deptJobBoxService.getDeptJobBox(1L);

        assertNotNull(result);
        assertEquals(1L, result.getDeptTaskBoxSn());
    }

    @Test
    @DisplayName("부서함 상세 조회 - 없음")
    void getDeptJobBox_NotFound() {
        when(deptJobBoxRepository.findById(99L)).thenReturn(Optional.empty());

        BusinessException error = assertThrows(BusinessException.class,
                () -> deptJobBoxService.getDeptJobBox(99L));

        assertEquals(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND, error.getErrorCode());
    }

    @Test
    @DisplayName("부서함 생성")
    void createDeptJobBox() {
        DeptJobBoxDto dto = new DeptJobBoxDto();
        dto.setDeptTaskBoxNm("New Box");
        dto.setDeptId("DEPT2");
        dto.setSortOrdr(2L);

        when(deptJobBoxRepository.save(any(DeptJobBox.class))).thenReturn(deptJobBox);

        Long sn = deptJobBoxService.createDeptJobBox("user1", dto);

        assertEquals(1L, sn);
    }

    @Test
    @DisplayName("부서함 수정")
    void updateDeptJobBox() {
        when(deptJobBoxRepository.findById(1L)).thenReturn(Optional.of(deptJobBox));

        DeptJobBoxDto dto = new DeptJobBoxDto();
        dto.setDeptTaskBoxNm("Updated Box");
        dto.setDeptId("DEPT1");
        dto.setSortOrdr(2L);

        deptJobBoxService.updateDeptJobBox(1L, "user1", dto);

        assertEquals("Updated Box", deptJobBox.getDeptTaskBoxNm());
    }

    @Test
    @DisplayName("부서함 수정 - 존재하지 않음")
    void updateDeptJobBox_NotFound() {
        when(deptJobBoxRepository.findById(99L)).thenReturn(Optional.empty());

        DeptJobBoxDto dto = new DeptJobBoxDto();

        // [W1-F3] 미존재는 400 이 아니라 404 다.
        BusinessException notFound = assertThrows(BusinessException.class,
                () -> deptJobBoxService.updateDeptJobBox(99L, "user1", dto));
        org.junit.jupiter.api.Assertions.assertEquals(
                nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND, notFound.getErrorCode());
    }

    @Test
    @DisplayName("부서함 삭제 - 산하 업무 없음")
    void deleteDeptJobBox() {
        when(deptJobRepository.existsByDeptTaskBoxSn(1L)).thenReturn(false);
        doNothing().when(deptJobBoxRepository).deleteById(1L);

        deptJobBoxService.deleteDeptJobBox(1L);

        verify(deptJobBoxRepository, times(1)).deleteById(1L);
    }

    /**
     * [V2_32 결속] 업무함과 업무는 별개 엔티티라 연쇄 삭제가 없다. 검사 없이 지우면 업무함 id 만
     * 들고 있는 업무가 고아로 남아 목록에서 업무함/부서가 빈 채 떠돈다 — 500 조차 나지 않아 더 조용하다.
     * 삭제를 막고 409 로 되돌리는 것이 이 가드의 존재 이유다.
     */
    @Test
    @DisplayName("부서함 삭제 - 산하 업무가 있으면 409(RESOURCE_IN_USE) 로 차단하고 삭제하지 않는다")
    void deleteDeptJobBox_conflictWhenTasksExist() {
        when(deptJobRepository.existsByDeptTaskBoxSn(1L)).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> deptJobBoxService.deleteDeptJobBox(1L));

        assertEquals(CommonErrorCode.RESOURCE_IN_USE, ex.getErrorCode());
        verify(deptJobBoxRepository, never()).deleteById(anyLong());
    }

    // ── 서비스 2차 가드(assertAdmin): 비관리자(USER)의 쓰기는 ACCESS_DENIED 로 차단, 저장소는 미접촉 ──
    @Test
    @DisplayName("부서함 생성 - 비관리자 차단")
    void createDeptJobBox_deniedForNonAdmin() {
        setAuthorities("ROLE_USER");
        DeptJobBoxDto dto = new DeptJobBoxDto();
        dto.setDeptTaskBoxNm("New Box");

        assertThrows(BusinessException.class, () -> deptJobBoxService.createDeptJobBox("user1", dto));
        verify(deptJobBoxRepository, never()).save(any(DeptJobBox.class));
    }

    @Test
    @DisplayName("부서함 수정 - 비관리자 차단")
    void updateDeptJobBox_deniedForNonAdmin() {
        setAuthorities("ROLE_USER");
        DeptJobBoxDto dto = new DeptJobBoxDto();

        assertThrows(BusinessException.class, () -> deptJobBoxService.updateDeptJobBox(1L, "user1", dto));
        verify(deptJobBoxRepository, never()).findById(anyLong());
    }

    @Test
    @DisplayName("부서함 삭제 - 비관리자 차단")
    void deleteDeptJobBox_deniedForNonAdmin() {
        setAuthorities("ROLE_USER");

        assertThrows(BusinessException.class, () -> deptJobBoxService.deleteDeptJobBox(1L));
        verify(deptJobBoxRepository, never()).deleteById(anyLong());
    }
}
