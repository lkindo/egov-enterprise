package egovframework.let.sec.gmt.service.impl;

import com.company.project.domain.group.GroupManageRepository;
import egovframework.let.sec.gmt.service.EgovGroupManageService;
import egovframework.let.sec.gmt.service.GroupManage;
import egovframework.let.sec.gmt.service.GroupManageVO;
import jakarta.annotation.Resource;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 그룹관리에 관한 비즈니스 클래스 (JPA 전환)
 */
@Service("egovGroupManageService")
@Transactional(readOnly = true)
public class EgovGroupManageServiceImpl extends EgovAbstractServiceImpl implements EgovGroupManageService {

    @Resource
    private GroupManageRepository groupManageRepository;

    @Override
    public GroupManageVO selectGroup(GroupManageVO groupManageVO) throws Exception {
        return groupManageRepository.findById(groupManageVO.getGroupId())
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    public List<GroupManageVO> selectGroupList(GroupManageVO groupManageVO) throws Exception {
        Pageable pageable = PageRequest.of(groupManageVO.getPageIndex() - 1, groupManageVO.getPageUnit());
        Page<com.company.project.domain.group.GroupManage> page = groupManageRepository
                .searchByKeyword(groupManageVO.getSearchKeyword(), pageable);
        return page.getContent().stream().map(this::convertToVo).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public GroupManageVO insertGroup(GroupManage groupManage, GroupManageVO groupManageVO) throws Exception {
        com.company.project.domain.group.GroupManage entity = com.company.project.domain.group.GroupManage.builder()
                .groupId(groupManage.getGroupId())
                .groupNm(groupManage.getGroupNm())
                .groupDc(groupManage.getGroupDc())
                .build();
        groupManageRepository.save(entity);
        return groupManageVO;
    }

    @Override
    @Transactional
    public void updateGroup(GroupManage groupManage) throws Exception {
        groupManageRepository.findById(groupManage.getGroupId()).ifPresent(entity -> {
            entity.update(groupManage.getGroupNm(), groupManage.getGroupDc());
        });
    }

    @Override
    @Transactional
    public void deleteGroup(GroupManage groupManage) throws Exception {
        groupManageRepository.deleteById(groupManage.getGroupId());
    }

    @Override
    public int selectGroupListTotCnt(GroupManageVO groupManageVO) throws Exception {
        Pageable pageable = PageRequest.of(0, 1);
        Page<com.company.project.domain.group.GroupManage> page = groupManageRepository
                .searchByKeyword(groupManageVO.getSearchKeyword(), pageable);
        return (int) page.getTotalElements();
    }

    private GroupManageVO convertToVo(com.company.project.domain.group.GroupManage entity) {
        GroupManageVO vo = new GroupManageVO();
        vo.setGroupId(entity.getGroupId());
        vo.setGroupNm(entity.getGroupNm());
        vo.setGroupDc(entity.getGroupDc());
        vo.setGroupCreatDe(entity.getGroupCreatDeString());
        return vo;
    }
}
