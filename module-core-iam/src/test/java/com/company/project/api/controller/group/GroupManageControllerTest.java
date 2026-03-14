package com.company.project.api.controller.group;

import com.company.project.service.group.GroupManageService;
import com.company.project.service.group.dto.GroupManageDto;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.support.StaticMessageSource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.MessageSource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GroupManageController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("GroupManageController 테스트")
class GroupManageControllerTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public MessageSource messageSource() {
            StaticMessageSource ms = new StaticMessageSource();
            ms.setUseCodeAsDefaultMessage(true); // 코드가 없으면 코드 자체를 메시지로 반환 (예외 방지)
            return ms;
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GroupManageService groupManageService;

    @MockitoBean
    private EgovPropertyService propertiesService;

    @Test
    @DisplayName("그룹 목록 뷰 이동 테스트")
    void selectGroupListViewTest() throws Exception {
        mockMvc.perform(get("/sec/gmt/EgovGroupListView.do"))
                .andExpect(status().isOk())
                .andExpect(view().name("sec/gmt/EgovGroupManage"));
    }

    @Test
    @DisplayName("그룹 목록 조회 테스트")
    void selectGroupListTest() throws Exception {
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(groupManageService.selectGroupList(any())).willReturn(Collections.emptyList());
        given(groupManageService.selectGroupListTotCnt(any())).willReturn(0);

        mockMvc.perform(get("/sec/gmt/EgovGroupList.do")
                .param("pageIndex", "1"))
                .andExpect(status().isOk())
                .andExpect(view().name("sec/gmt/EgovGroupManage"))
                .andExpect(model().attributeExists("groupList"))
                .andExpect(model().attributeExists("paginationInfo"));
    }

    @Test
    @DisplayName("그룹 상세 조회 테스트")
    void selectGroupTest() throws Exception {
        given(groupManageService.selectGroup("GROUP_001")).willReturn(new GroupManageDto());

        mockMvc.perform(get("/sec/gmt/EgovGroup.do")
                .param("groupId", "GROUP_001"))
                .andExpect(status().isOk())
                .andExpect(view().name("sec/gmt/EgovGroupUpdate"))
                .andExpect(model().attributeExists("groupManage"));
    }

    @Test
    @DisplayName("그룹 등록 뷰 이동 테스트")
    void insertGroupViewTest() throws Exception {
        mockMvc.perform(get("/sec/gmt/EgovGroupInsertView.do"))
                .andExpect(status().isOk())
                .andExpect(view().name("sec/gmt/EgovGroupInsert"))
                .andExpect(model().attributeExists("groupManage"));
    }

    @Test
    @DisplayName("그룹 등록 성공 테스트")
    void insertGroupSuccessTest() throws Exception {
        mockMvc.perform(post("/sec/gmt/EgovGroupInsert.do")
                .param("groupId", "GRP1")
                .param("groupNm", "Group 1"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/sec/gmt/EgovGroupList.do"));

        verify(groupManageService).insertGroup(any(GroupManageDto.class));
    }

    @Test
    @DisplayName("그룹 수정 성공 테스트")
    void updateGroupSuccessTest() throws Exception {
        mockMvc.perform(post("/sec/gmt/EgovGroupUpdate.do")
                .param("groupId", "GRP1")
                .param("groupNm", "Updated Group"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/sec/gmt/EgovGroup.do?groupId=GRP1"));

        verify(groupManageService).updateGroup(any(GroupManageDto.class));
    }

    @Test
    @DisplayName("그룹 삭제 테스트")
    void deleteGroupTest() throws Exception {
        mockMvc.perform(post("/sec/gmt/EgovGroupDelete.do")
                .param("groupId", "GRP1"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/sec/gmt/EgovGroupList.do"));

        verify(groupManageService).deleteGroup("GRP1");
    }

    @Test
    @DisplayName("그룹 다중 삭제 테스트")
    void deleteGroupListTest() throws Exception {
        mockMvc.perform(post("/sec/gmt/EgovGroupListDelete.do")
                .param("groupIds", "GRP1;GRP2"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/sec/gmt/EgovGroupList.do"));

        verify(groupManageService).deleteGroups(any(String[].class));
    }
}
