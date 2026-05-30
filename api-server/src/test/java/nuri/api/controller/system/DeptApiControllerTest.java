package nuri.api.controller.system;

import nuri.business.test.BaseControllerTest;
import nuri.business.service.usermanagement.EgovDeptManageService;
import nuri.business.service.usermanagement.dto.DeptManageDto;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class DeptApiControllerTest extends BaseControllerTest {

    private EgovDeptManageService deptManageService;
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    protected Object getController() {
        deptManageService = mock(EgovDeptManageService.class);
        return new DeptApiController(deptManageService);
    }

    @Test
    public void getDepts_ShouldReturnPagedDepts() throws Exception {
        DeptManageDto dto = DeptManageDto.builder()
                .orgnztId("ORGNZT_0000000000001")
                .orgnztNm("테스트 부서")
                .orgnztDc("테스트 부서 설명")
                .build();
        Page<DeptManageDto> page = new PageImpl<>(Collections.singletonList(dto), PageRequest.of(0, 10), 1);

        when(deptManageService.getDeptManageList(eq("테스트"), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/departments")
                .param("keyword", "테스트")
                .param("page", "0")
                .param("size", "10")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].orgnztId").value("ORGNZT_0000000000001"))
                .andExpect(jsonPath("$.data.list[0].orgnztNm").value("테스트 부서"));
    }

    @Test
    public void getDept_ShouldReturnDeptDetail() throws Exception {
        DeptManageDto dto = DeptManageDto.builder()
                .orgnztId("ORGNZT_0000000000001")
                .orgnztNm("테스트 부서")
                .orgnztDc("테스트 부서 설명")
                .build();

        when(deptManageService.getDeptManage("ORGNZT_0000000000001")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/departments/ORGNZT_0000000000001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orgnztId").value("ORGNZT_0000000000001"))
                .andExpect(jsonPath("$.data.orgnztNm").value("테스트 부서"));
    }

    @Test
    public void insertDept_ShouldSucceed() throws Exception {
        DeptManageDto dto = DeptManageDto.builder()
                .orgnztNm("신규 부서")
                .orgnztDc("신규 부서 설명")
                .build();

        doNothing().when(deptManageService).insertDeptManage(any(DeptManageDto.class));

        mockMvc.perform(post("/api/v1/admin/system/departments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(deptManageService, times(1)).insertDeptManage(any(DeptManageDto.class));
    }

    @Test
    public void updateDept_ShouldSucceed() throws Exception {
        DeptManageDto dto = DeptManageDto.builder()
                .orgnztNm("수정 부서")
                .orgnztDc("수정 부서 설명")
                .build();

        doNothing().when(deptManageService).updateDeptManage(any(DeptManageDto.class));

        mockMvc.perform(put("/api/v1/admin/system/departments/ORGNZT_0000000000001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(deptManageService, times(1)).updateDeptManage(argThat(d -> "ORGNZT_0000000000001".equals(d.getOrgnztId())));
    }

    @Test
    public void deleteDept_ShouldSucceed() throws Exception {
        doNothing().when(deptManageService).deleteDeptManage("ORGNZT_0000000000001");

        mockMvc.perform(delete("/api/v1/admin/system/departments/ORGNZT_0000000000001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(deptManageService, times(1)).deleteDeptManage("ORGNZT_0000000000001");
    }
}
