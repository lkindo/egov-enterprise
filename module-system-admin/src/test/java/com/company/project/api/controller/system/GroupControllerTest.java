package com.company.project.api.controller.system;

import com.company.project.service.group.GroupManageService;
import com.company.project.service.group.dto.GroupManageDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = GroupController.class)
@ContextConfiguration(classes = {
        GroupController.class,
        GroupControllerTest.TestConfig.class
})
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class GroupControllerTest {

    @org.springframework.boot.SpringBootConfiguration
    @org.springframework.boot.autoconfigure.EnableAutoConfiguration(exclude = {
            org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration.class,
            org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration.class,
            org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration.class,
            org.springframework.boot.autoconfigure.batch.BatchAutoConfiguration.class
    })
    static class TestConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private GroupManageService groupManageService;

    @Test
    @DisplayName("그룹 목록 조회 테스트")
    void getGroups_success() throws Exception {
        // given
        when(groupManageService.selectGroupList(any())).thenReturn(Collections.emptyList());
        when(groupManageService.selectGroupListTotCnt(any())).thenReturn(0);

        // when & then
        mockMvc.perform(get("/api/v1/admin/system/groups")
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("그룹 상세 조회 테스트")
    void getGroup_success() throws Exception {
        // given
        GroupManageDto dto = new GroupManageDto();
        dto.setGroupId("GRP_01");
        dto.setGroupNm("Test Group");
        when(groupManageService.selectGroup("GRP_01")).thenReturn(dto);

        // when & then
        mockMvc.perform(get("/api/v1/admin/system/groups/GRP_01")
                .contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.groupId").value("GRP_01"));
    }

    @Test
    @DisplayName("그룹 등록 테스트")
    void createGroup_success() throws Exception {
        // given
        GroupManageDto dto = new GroupManageDto();
        dto.setGroupNm("New Group");

        // when & then
        mockMvc.perform(post("/api/v1/admin/system/groups")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andDo(print())
                .andExpect(status().isOk());
    }
}
