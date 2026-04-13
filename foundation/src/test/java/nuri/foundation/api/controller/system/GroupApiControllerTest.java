package nuri.foundation.api.controller.system;

import nuri.foundation.test.BaseControllerTest;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import nuri.foundation.service.group.GroupManageService;
import nuri.foundation.service.group.dto.GroupManageDto;
import org.springframework.http.MediaType;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("GroupApiController 테스트")
class GroupApiControllerTest extends BaseControllerTest {

    private GroupManageService groupManageService;
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    protected Object getController() {
        groupManageService = mock(GroupManageService.class);
        return new GroupApiController(groupManageService);
    }

    @Test
    @DisplayName("그룹 목록 조회 성공")
    void testGetGroups() throws Exception {
        // Given
        when(groupManageService.selectGroupList(any())).thenReturn(Collections.emptyList());
        when(groupManageService.selectGroupListTotCnt(any())).thenReturn(0);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/groups")
                .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("그룹 상세 조회 성공")
    void testGetGroup() throws Exception {
        // Given
        GroupManageDto dto = new GroupManageDto();
        dto.setGroupId("GROUP_001");
        dto.setGroupNm("관리자 그룹");
        when(groupManageService.selectGroup("GROUP_001")).thenReturn(dto);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/groups/GROUP_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.groupId").value("GROUP_001"));
    }

    @Test
    @DisplayName("그룹 등록 성공")
    void testCreateGroup() throws Exception {
        // Given
        GroupManageDto dto = new GroupManageDto();
        dto.setGroupId("GROUP_NEW");
        dto.setGroupNm("신규 그룹");

        // When & Then
        mockMvc.perform(post("/api/v1/admin/system/groups")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(groupManageService, times(1)).insertGroup(any(GroupManageDto.class));
    }

    @Test
    @DisplayName("그룹 삭제 성공")
    void testDeleteGroup() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/admin/system/groups/GROUP_001"))
                .andExpect(status().isOk());

        verify(groupManageService, times(1)).deleteGroup("GROUP_001");
    }

    @Test
    @DisplayName("그룹 수정 성공")
    void testUpdateGroup() throws Exception {
        GroupManageDto dto = new GroupManageDto();
        dto.setGroupNm("Updated");
        mockMvc.perform(put("/api/v1/admin/system/groups/GROUP_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("그룹 다중 삭제")
    void testDeleteGroups() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/system/groups")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(List.of("G1", "G2"))))
                .andExpect(status().isOk());
        verify(groupManageService).deleteGroups(any());
    }
}