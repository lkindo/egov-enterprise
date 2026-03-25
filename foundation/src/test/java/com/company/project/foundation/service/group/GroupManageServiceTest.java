package com.company.project.foundation.service.group;

import com.company.project.foundation.domain.group.GroupManage;
import com.company.project.foundation.domain.group.GroupManageRepository;
import com.company.project.foundation.service.group.dto.GroupManageDto;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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
    @DisplayName("그룹 목록 조회 성공")
    void selectGroupList_Success() {
        // Given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setPageSize(10);
        GroupManage entity = GroupManage.builder().groupId("G1").groupNm("Group1").build();
        given(groupManageRepository.findAll(any(Pageable.class))).willReturn(new PageImpl<>(List.of(entity)));

        // When
        List<GroupManageDto> result = groupManageService.selectGroupList(searchVO);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getGroupNm()).isEqualTo("Group1");
    }

    @Test
    @DisplayName("그룹 상세 조회 성공")
    void selectGroup_Success() {
        // Given
        GroupManage entity = GroupManage.builder().groupId("G1").groupNm("Group1").build();
        given(groupManageRepository.findById("G1")).willReturn(Optional.of(entity));

        // When
        GroupManageDto result = groupManageService.selectGroup("G1");

        // Then
        assertThat(result.getGroupId()).isEqualTo("G1");
    }

    @Test
    @DisplayName("그룹 등록 성공")
    void insertGroup_Success() {
        // Given
        GroupManageDto dto = GroupManageDto.builder().groupNm("New Group").build();

        // When
        String groupId = groupManageService.insertGroup(dto);

        // Then
        assertThat(groupId).startsWith("GROUP_");
        verify(groupManageRepository).save(any(GroupManage.class));
    }

    @Test
    @DisplayName("그룹 수정 성공")
    void updateGroup_Success() {
        // Given
        GroupManage entity = GroupManage.builder().groupId("G1").build();
        given(groupManageRepository.findById("G1")).willReturn(Optional.of(entity));
        GroupManageDto dto = GroupManageDto.builder().groupId("G1").groupNm("Updated Name").build();

        // When
        groupManageService.updateGroup(dto);

        // Then
        assertThat(entity.getGroupNm()).isEqualTo("Updated Name");
    }
}
