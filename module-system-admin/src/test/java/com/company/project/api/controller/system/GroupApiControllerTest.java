package com.company.project.api.controller.system;

import com.company.project.service.group.GroupManageService;
import com.company.project.service.group.dto.GroupManageDto;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import java.util.List;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GroupApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("GroupApiController 테스트")
class GroupApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private GroupManageService groupManageService;

    private final String BASE_URL = "/api/v1/admin/system/groups";

    @Test
    @DisplayName("그룹 목록 조회 성공")
    void getGroups_Success() throws Exception {
        given(groupManageService.selectGroupList(any(ComDefaultVO.class))).willReturn(Collections.emptyList());
        given(groupManageService.selectGroupListTotCnt(any(ComDefaultVO.class))).willReturn(0);

        mockMvc.perform(get(BASE_URL)
                        .param("pageIndex", "1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list").isArray());
    }

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

    @Test
    @DisplayName("그룹 등록 성공")
    void createGroup_Success() throws Exception {
        GroupManageDto dto = GroupManageDto.builder().groupNm("New Group").build();

        mockMvc.perform(post(BASE_URL)
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(dto))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("그룹 수정 성공")
    void updateGroup_Success() throws Exception {
        GroupManageDto dto = GroupManageDto.builder().groupNm("Updated Group").build();

        mockMvc.perform(put(BASE_URL + "/group1")
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(dto))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("그룹 단일 삭제 성공")
    void deleteGroup_Success() throws Exception {
        mockMvc.perform(delete(BASE_URL + "/group1")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("그룹 다중 삭제 성공")
    void deleteGroups_Success() throws Exception {
        List<String> ids = List.of("group1", "group2");

        mockMvc.perform(delete(BASE_URL)
                        .with(csrf())
                        .content(objectMapper.writeValueAsString(ids))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
