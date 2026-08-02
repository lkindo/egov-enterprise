package nuri.business.service.group;

import nuri.business.domain.group.GroupManage;
import nuri.business.domain.group.GroupManageRepository;
import nuri.business.service.group.dto.GroupManageDto;
import nuri.business.domain.common.BaseSearchDto;
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
@DisplayName("GroupManageService (그룹 관리 서비스) 테스트")
class GroupManageServiceTest {

    @Mock
    private GroupManageRepository groupManageRepository;

    @Mock
    private nuri.business.domain.user.repository.UserRepository userRepository;

    @InjectMocks
    private GroupManageService groupManageService;

    @Test
    @DisplayName("그룹 목록 조회 성공")
    void selectGroupList_Success() {
        // Given
        BaseSearchDto searchVO = new BaseSearchDto();
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

    @Test
    @DisplayName("그룹 목록 조회 - 키워드 검색")
    void selectGroupList_WithKeyword() {
        // Given
        BaseSearchDto searchVO = new BaseSearchDto();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(0); // Test pageUnit <= 0 fallback to 10
        searchVO.setSearchKeyword("test");
        GroupManage entity = GroupManage.builder().groupId("G1").groupNm("Group1").build();
        given(groupManageRepository.searchByKeyword(any(), any(Pageable.class))).willReturn(new PageImpl<>(List.of(entity)));

        // When
        List<GroupManageDto> result = groupManageService.selectGroupList(searchVO);

        // Then
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("그룹 총 건수 조회 - 키워드 없음")
    void selectGroupListTotCnt_NoKeyword() {
        // Given
        BaseSearchDto searchVO = new BaseSearchDto();
        given(groupManageRepository.count()).willReturn(5L);

        // When
        int result = groupManageService.selectGroupListTotCnt(searchVO);

        // Then
        assertThat(result).isEqualTo(5);
    }

    @Test
    @DisplayName("그룹 총 건수 조회 - 키워드 있음")
    void selectGroupListTotCnt_WithKeyword() {
        // Given
        BaseSearchDto searchVO = new BaseSearchDto();
        searchVO.setSearchKeyword("test");
        GroupManage entity = GroupManage.builder().groupId("G1").groupNm("Group1").build();
        given(groupManageRepository.searchByKeyword(any(), any(Pageable.class))).willReturn(new PageImpl<>(List.of(entity)));

        // When
        int result = groupManageService.selectGroupListTotCnt(searchVO);

        // Then
        assertThat(result).isEqualTo(1);
    }

    @Test
    @DisplayName("그룹 상세 조회 실패 - 존재하지 않음")
    void selectGroup_NotFound() {
        // Given
        given(groupManageRepository.findById("G1")).willReturn(Optional.empty());

        // When & Then
        // [W1-F3] RuntimeException 단언은 vacuous 였다 — BusinessException 이 그 하위라
        //   404 로 고쳐도 그대로 green 이어서 이 수정이 게이트로 증명되지 않는다.
        //   타입과 ErrorCode 를 함께 조여야 '미존재는 404' 라는 계약이 고정된다.
        nuri.foundation.core.exception.BusinessException ex = org.junit.jupiter.api.Assertions.assertThrows(
                nuri.foundation.core.exception.BusinessException.class, () -> groupManageService.selectGroup("G1"));
        org.junit.jupiter.api.Assertions.assertEquals(
                nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("그룹 등록 성공 - ID 직접 지정")
    void insertGroup_WithId() {
        // Given
        GroupManageDto dto = GroupManageDto.builder().groupId("CUSTOM_ID").groupNm("New Group").build();

        // When
        String groupId = groupManageService.insertGroup(dto);

        // Then
        assertThat(groupId).isEqualTo("CUSTOM_ID");
        verify(groupManageRepository).save(any(GroupManage.class));
    }

    @Test
    @DisplayName("그룹 수정 실패 - 존재하지 않음")
    void updateGroup_NotFound() {
        // Given
        given(groupManageRepository.findById("G1")).willReturn(Optional.empty());
        GroupManageDto dto = GroupManageDto.builder().groupId("G1").groupNm("Updated Name").build();

        // When & Then
        nuri.foundation.core.exception.BusinessException ex = org.junit.jupiter.api.Assertions.assertThrows(
                nuri.foundation.core.exception.BusinessException.class, () -> groupManageService.updateGroup(dto));
        org.junit.jupiter.api.Assertions.assertEquals(
                nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("그룹 삭제")
    void deleteGroup() {
        // When
        groupManageService.deleteGroup("G1");

        // Then
        verify(groupManageRepository).deleteById("G1");
    }

    @Test
    @DisplayName("그룹 다중 삭제")
    void deleteGroups() {
        // When
        groupManageService.deleteGroups(new String[]{"G1", "G2"});

        // Then
        verify(groupManageRepository).deleteAllById(any());
    }
}
