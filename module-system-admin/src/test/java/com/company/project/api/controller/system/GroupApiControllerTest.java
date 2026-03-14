package com.company.project.api.controller.system;

import com.company.project.service.group.GroupManageService;
import com.company.project.service.group.dto.GroupManageDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GroupApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("GroupApiController 테스트")
class GroupApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GroupManageService groupManageService;

    private final String BASE_URL = "/api/v1/admin/system/groups";

    @Test
    @DisplayName("그룹 상세 조회 성공")
    void getGroup_Success() throws Exception {
        given(groupManageService.selectGroup(anyString())).willReturn(
                GroupManageDto.builder().groupId("group1").groupNm("Group One").build()
        );

        mockMvc.perform(get(BASE_URL + "/group1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.groupNm").value("Group One"));
    }
}
