package nuri.foundation.api.controller.system;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.service.group.GroupManageService;
import nuri.foundation.service.group.dto.GroupManageDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("GroupApiController 테스트")
class GroupApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private GroupManageService groupManageService;

    @InjectMocks
    private GroupApiController groupApiController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(groupApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
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
}