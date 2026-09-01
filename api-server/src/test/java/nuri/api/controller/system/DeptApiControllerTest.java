package nuri.api.controller.system;

import nuri.business.test.BaseControllerTest;
import nuri.business.service.department.DeptManageService;
import nuri.business.service.department.dto.DeptManageDto;
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

    private DeptManageService deptManageService;
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    protected Object getController() {
        deptManageService = mock(DeptManageService.class);
        return new DeptApiController(deptManageService);
    }

    @Test
    public void getDepts_ShouldReturnPagedDepts() throws Exception {
        DeptManageDto dto = DeptManageDto.builder()
                .ognzId("ORGNZT_0000000000001")
                .ognzNm("테스트 부서")
                .ognzExpln("테스트 부서 설명")
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
                .andExpect(jsonPath("$.data.list[0].ognzId").value("ORGNZT_0000000000001"))
                .andExpect(jsonPath("$.data.list[0].ognzNm").value("테스트 부서"));
    }

    @Test
    public void getDept_ShouldReturnDeptDetail() throws Exception {
        DeptManageDto dto = DeptManageDto.builder()
                .ognzId("ORGNZT_0000000000001")
                .ognzNm("테스트 부서")
                .ognzExpln("테스트 부서 설명")
                .build();

        when(deptManageService.getDeptManage("ORGNZT_0000000000001")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/departments/ORGNZT_0000000000001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.ognzId").value("ORGNZT_0000000000001"))
                .andExpect(jsonPath("$.data.ognzNm").value("테스트 부서"));
    }

    /**
     * ⚠ 회귀 방지: 종전 이 테스트는 요청 본문에 ognzId("ORGNZT_NEW")를 명시해 통과했고, 그 때문에
     * "실제 등록 폼은 ognzId 를 보내지 않아 @NotBlank 로 항상 400" 이라는 결함을 잡지 못했다.
     * 이제 ognzId 를 **보내지 않는** 실제 UI 계약으로 요청하고, 서버가 채번한 ID 가 응답되는지 단언한다.
     */
    @Test
    public void insertDept_ShouldSucceed() throws Exception {
        DeptManageDto dto = DeptManageDto.builder()
                .ognzNm("신규 부서")
                .ognzExpln("신규 부서 설명")
                .build();

        when(deptManageService.insertDeptManage(any(DeptManageDto.class))).thenReturn("ORGNZT_GENERATED");

        mockMvc.perform(post("/api/v1/admin/system/departments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("ORGNZT_GENERATED"));

        verify(deptManageService, times(1)).insertDeptManage(any(DeptManageDto.class));
    }

    @Test
    public void updateDeptHierarchy_ShouldSucceed() throws Exception {
        String body = "[{\"ognzId\":\"ORGNZT_CHILD\",\"upOgnzId\":\"ORGNZT_PARENT\",\"sortOrdr\":1}]";
        doNothing().when(deptManageService).updateDeptHierarchy(any());

        mockMvc.perform(put("/api/v1/admin/system/departments/batch-hierarchy")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(deptManageService, times(1)).updateDeptHierarchy(argThat(items ->
                items.size() == 1
                        && "ORGNZT_CHILD".equals(items.get(0).getOgnzId())
                        && "ORGNZT_PARENT".equals(items.get(0).getUpOgnzId())
                        && Integer.valueOf(1).equals(items.get(0).getSortOrdr())));
    }

    @Test
    public void updateDeptHierarchy_MissingDepartmentId_ShouldBeRejected() throws Exception {
        String body = "[{\"upOgnzId\":\"ORGNZT_PARENT\",\"sortOrdr\":1}]";

        mockMvc.perform(put("/api/v1/admin/system/departments/batch-hierarchy")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest());

        verify(deptManageService, never()).updateDeptHierarchy(any());
    }

    @Test
    public void updateDept_ShouldSucceed() throws Exception {
        DeptManageDto dto = DeptManageDto.builder()
                .ognzId("ORGNZT_0000000000001")
                .ognzNm("수정 부서")
                .ognzExpln("수정 부서 설명")
                .build();

        doNothing().when(deptManageService).updateDeptManage(any(DeptManageDto.class));

        mockMvc.perform(put("/api/v1/admin/system/departments/ORGNZT_0000000000001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(deptManageService, times(1)).updateDeptManage(argThat(d -> "ORGNZT_0000000000001".equals(d.getOgnzId())));
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
