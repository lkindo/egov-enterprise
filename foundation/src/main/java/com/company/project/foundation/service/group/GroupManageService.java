package com.company.project.foundation.service.group;

import com.company.project.foundation.domain.group.GroupManage;
import com.company.project.foundation.domain.group.GroupManageRepository;
import com.company.project.foundation.service.group.dto.GroupManageDto;
import egovframework.com.cmm.ComDefaultVO;
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
 * 洹몃퉬??
 */
@Service("projectGroupManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GroupManageService {

    private final GroupManageRepository groupManageRepository;

    /**
     * 洹몃紐⑸議고??     */
    public List<GroupManageDto> selectGroupList(ComDefaultVO searchVO) {
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
     * 洹몃紐⑸嫄댁??     */
    public int selectGroupListTotCnt(ComDefaultVO searchVO) {
        String keyword = searchVO.getSearchKeyword();
        if (keyword != null && !keyword.isEmpty()) {
            return (int) groupManageRepository.searchByKeyword(keyword, Pageable.unpaged()).getTotalElements();
        }
        return (int) groupManageRepository.count();
    }

    /**
     * 洹몃??곸꽭 議고??     */
    public GroupManageDto selectGroup(String groupId) {
        return groupManageRepository.findById(Objects.requireNonNull(groupId))
                .map(this::toDto)
                .orElseThrow(() -> new RuntimeException("Group not found: " + groupId));
    }

    /**
     * 洹몃??깅줉
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
     * 洹몃???젙
     */
    @Transactional
    public void updateGroup(GroupManageDto dto) {
        GroupManage entity = groupManageRepository.findById(Objects.requireNonNull(dto.getGroupId()))
                .orElseThrow(() -> new RuntimeException("Group not found: " + dto.getGroupId()));
        entity.update(dto.getGroupNm(), dto.getGroupDc());
    }

    /**
     * 洹몃?????     */
    @Transactional
    public void deleteGroup(String groupId) {
        groupManageRepository.deleteById(Objects.requireNonNull(groupId));
    }

    /**
     * 洹몃???쨷 ????     */
    @Transactional
    public void deleteGroups(String[] groupIds) {
        groupManageRepository.deleteAllById(Objects.requireNonNull(Arrays.asList(groupIds)));
    }

    private GroupManageDto toDto(GroupManage entity) {
        return GroupManageDto.builder()
                .groupId(entity.getGroupId())
                .groupNm(entity.getGroupNm())
                .groupDc(entity.getGroupDc())
                .groupCreatDe(entity.getGroupCreatDeString())
                .build();
    }
}
