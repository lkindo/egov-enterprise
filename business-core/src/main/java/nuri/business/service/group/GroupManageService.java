package nuri.business.service.group;

import nuri.business.domain.common.BaseSearchDto;
import nuri.business.domain.group.GroupManage;
import nuri.business.domain.group.GroupManageRepository;
import nuri.business.service.group.dto.GroupManageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 그룹 관리 서비스
 */
@Service("projectGroupManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GroupManageService {

    private final GroupManageRepository groupManageRepository;

    /**
     * 그룹 목록 조회
     */
    public List<GroupManageDto> selectGroupList(BaseSearchDto searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);

        Page<GroupManage> page;
        String keyword = searchVO.getSearchKeyword();
        if (keyword != null && !keyword.isEmpty()) {
            page = groupManageRepository.searchByKeyword(keyword, pageable);
        } else {
            page = groupManageRepository.findAll(pageable);
        }
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * 그룹 목록 총 건수
     */
    public int selectGroupListTotCnt(BaseSearchDto searchVO) {
        String keyword = searchVO.getSearchKeyword();
        if (keyword != null && !keyword.isEmpty()) {
            return (int) groupManageRepository.searchByKeyword(keyword, Pageable.unpaged()).getTotalElements();
        }
        return (int) groupManageRepository.count();
    }

    /**
     * 그룹 상세 조회
     */
    public GroupManageDto selectGroup(String groupId) {
        return groupManageRepository.findById(Objects.requireNonNull(groupId))
                .map(this::toDto)
                .orElseThrow(() -> new RuntimeException("Group not found: " + groupId));
    }

    /**
     * 그룹 등록
     */
    @Transactional
    public String insertGroup(GroupManageDto dto) {
        // Generate ID if not provided
        String groupId = dto.getGroupId();
        if (groupId == null || groupId.isEmpty()) {
            groupId = "GROUP_" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        }

        GroupManage entity = GroupManage.builder()
                .groupId(groupId)
                .groupNm(dto.getGroupNm())
                .groupDc(dto.getGroupDc())
                .build();
        groupManageRepository.save(Objects.requireNonNull(entity));
        return groupId;
    }

    /**
     * 그룹 수정
     */
    @Transactional
    public void updateGroup(GroupManageDto dto) {
        GroupManage entity = groupManageRepository.findById(Objects.requireNonNull(dto.getGroupId()))
                .orElseThrow(() -> new RuntimeException("Group not found: " + dto.getGroupId()));
        entity.update(dto.getGroupNm(), dto.getGroupDc());
    }

    /**
     * 그룹 삭제
     */
    @Transactional
    public void deleteGroup(String groupId) {
        groupManageRepository.deleteById(Objects.requireNonNull(groupId));
    }

    /**
     * 그룹 다중 삭제
     */
    @Transactional
    public void deleteGroups(String[] groupIds) {
        groupManageRepository.deleteAllById(Objects.requireNonNull(Arrays.asList(groupIds)));
    }

    private GroupManageDto toDto(GroupManage entity) {
        return GroupManageDto.builder()
                .groupId(entity.getGroupId())
                .groupNm(entity.getGroupNm())
                .groupDc(entity.getGroupDc())
                .groupCrtYmd(entity.getGroupCrtYmd() != null ? entity.getGroupCrtYmd().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : "")
                .build();
    }
}
