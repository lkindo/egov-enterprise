package nuri.api.controller.system;

import nuri.foundation.test.BaseControllerTest;
import nuri.foundation.domain.auth.DeptAuthorProjection;
import nuri.foundation.domain.common.BaseSearchDto;
import nuri.foundation.service.auth.UserAuthorityManageService;
import nuri.foundation.service.auth.dto.DeptAuthorBatchRequest;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;

import java.util.Arrays;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class DeptAuthorityApiControllerTest extends BaseControllerTest {

    private UserAuthorityManageService userAuthorityManageService;
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    protected Object getController() {
        userAuthorityManageService = mock(UserAuthorityManageService.class);
        return new DeptAuthorityApiController(userAuthorityManageService);
    }

    @Test
    public void getDeptAuthorities_ShouldReturnAuthorities() throws Exception {
        DeptAuthorProjection projection = DeptAuthorProjection.builder()
                .deptCode("ORGNZT_0000000000001")
                .deptNm("기획부")
                .userId("user1")
                .userNm("홍길동")
                .authorCode("ROLE_USER")
                .uniqId("USR_0001")
                .regYn("Y")
                .build();
        Page<DeptAuthorProjection> page = new PageImpl<>(Collections.singletonList(projection), PageRequest.of(0, 10), 1);

        when(userAuthorityManageService.selectDeptAuthorityList(eq("ORGNZT_0000000000001"), any(BaseSearchDto.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/dept-authorities/ORGNZT_0000000000001")
                .param("searchKeyword", "홍길동")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].deptCode").value("ORGNZT_0000000000001"))
                .andExpect(jsonPath("$.data.list[0].userNm").value("홍길동"))
                .andExpect(jsonPath("$.data.list[0].authorCode").value("ROLE_USER"));
    }

    @Test
    public void saveDeptUserAuthorities_ShouldSucceed() throws Exception {
        DeptAuthorBatchRequest request = new DeptAuthorBatchRequest();
        request.setDeptId("ORGNZT_0000000000001");
        request.setAuthorCode("ROLE_ADMIN");
        request.setAllMembers(false);
        request.setUserIds(Arrays.asList("user1", "user2"));

        doNothing().when(userAuthorityManageService).saveDeptAuthorities(any(DeptAuthorBatchRequest.class));

        mockMvc.perform(post("/api/v1/admin/system/dept-authorities/batch")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(userAuthorityManageService, times(1)).saveDeptAuthorities(any(DeptAuthorBatchRequest.class));
    }
}
