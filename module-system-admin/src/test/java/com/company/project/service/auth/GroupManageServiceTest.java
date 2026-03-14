package com.company.project.service.auth;

import com.company.project.domain.group.GroupManage;
import com.company.project.domain.group.GroupManageRepository;
import com.company.project.service.group.GroupManageService;
import com.company.project.service.group.dto.GroupManageDto;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("GroupManageService 테스트")
class GroupManageServiceTest {

    @Mock
    private GroupManageRepository groupManageRepository;

    @InjectMocks
    private GroupManageService groupManageService;

    @Test
    @DisplayName("그룹 목록 조회")
    void selectGroupList_Success() {
        // Given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);
        searchVO.setSearchKeyword("Group");

        GroupManage entity = GroupManage.builder().groupId("GROUP_1").groupNm("Group 1").build();
        Page<GroupManage> page = new PageImpl<>(List.of(entity));
        given(groupManageRepository.searchByKeyword(anyString(), any(Pageable.class))).willReturn(page);

        // When
        List<GroupManageDto> result = groupManageService.selectGroupList(searchVO);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getGroupId()).isEqualTo("GROUP_1");
    }

    @Test
    @DisplayName("그룹 목록 총 건수 조회")
    void selectGroupListTotCnt_Success() {
        // Given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setSearchKeyword("Group");
        Page<GroupManage> page = new PageImpl<>(List.of(), Pageable.unpaged(), 5);
        given(groupManageRepository.searchByKeyword(anyString(), any(Pageable.class))).willReturn(page);

        // When
        int result = groupManageService.selectGroupListTotCnt(searchVO);

        // Then
        assertThat(result).isEqualTo(5);
    }

    @Test
    @DisplayName("그룹 상세 조회")
    void selectGroup_Success() {
        // Given
        GroupManage entity = GroupManage.builder().groupId("GROUP_1").groupNm("Group 1").build();
        given(groupManageRepository.findById("GROUP_1")).willReturn(Optional.of(entity));

        // When
        GroupManageDto result = groupManageService.selectGroup("GROUP_1");

        // Then
        assertThat(result.getGroupId()).isEqualTo("GROUP_1");
    }

    @Test
    @DisplayName("그룹 등록")
    void insertGroup_Success() {
        // Given
        GroupManageDto dto = GroupManageDto.builder()
                .groupNm("New Group")
                .groupDc("Description")
                .build();

        // When
        String result = groupManageService.insertGroup(dto);

        // Then
        assertThat(result).startsWith("GROUP_");
        verify(groupManageRepository).save(any(GroupManage.class));
    }

    @Test
    @DisplayName("그룹 수정")
    void updateGroup_Success() {
        // Given
        GroupManage entity = GroupManage.builder().groupId("GROUP_1").groupNm("Group 1").build();
        given(groupManageRepository.findById("GROUP_1")).willReturn(Optional.of(entity));

        GroupManageDto dto = GroupManageDto.builder()
                .groupId("GROUP_1")
                .groupNm("Updated Group")
                .groupDc("Updated Dc")
                .build();

        // When
        groupManageService.updateGroup(dto);

        // Then
        verify(groupManageRepository).findById("GROUP_1");
    }

    @Test
    @DisplayName("그룹 삭제")
    void deleteGroup_Success() {
        // When
        groupManageService.deleteGroup("GROUP_1");

        // Then
        verify(groupManageRepository).deleteById("GROUP_1");
    }

    @Test
    @DisplayName("그룹 다중 삭제")
    void deleteGroups_Success() {
        // Given
        String[] groupIds = {"GROUP_1", "GROUP_2"};

        // When
        groupManageService.deleteGroups(groupIds);

        // Then
        verify(groupManageRepository).deleteAllById(any());
    }
}
