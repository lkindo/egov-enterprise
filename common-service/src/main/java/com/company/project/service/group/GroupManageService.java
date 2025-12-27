package com.company.project.service.group;

import com.company.project.domain.group.GroupManage;
import com.company.project.domain.group.GroupManageRepository;
import com.company.project.service.group.dto.GroupManageDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
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
     * 그룹 목록 총 건수
     */
    public int selectGroupListTotCnt(ComDefaultVO searchVO) {
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
        return groupManageRepository.findById(groupId)
                .map(this::toDto)
                .orElse(null);
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
        groupManageRepository.save(entity);
        return groupId;
    }

    /**
     * 그룹 수정
     */
    @Transactional
    public void updateGroup(GroupManageDto dto) {
        GroupManage entity = groupManageRepository.findById(dto.getGroupId())
                .orElseThrow(() -> new RuntimeException("Group not found: " + dto.getGroupId()));
        entity.update(dto.getGroupNm(), dto.getGroupDc());
    }

    /**
     * 그룹 삭제
     */
    @Transactional
    public void deleteGroup(String groupId) {
        groupManageRepository.deleteById(groupId);
    }

    /**
     * 그룹 다중 삭제
     */
    @Transactional
    public void deleteGroups(String[] groupIds) {
        for (String groupId : groupIds) {
            groupManageRepository.deleteById(groupId);
        }
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
