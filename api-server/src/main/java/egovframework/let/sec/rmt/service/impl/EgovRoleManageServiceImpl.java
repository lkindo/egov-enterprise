package egovframework.let.sec.rmt.service.impl;

import com.company.project.domain.auth.RoleInfo;
import com.company.project.domain.auth.RoleInfoRepository;
import egovframework.let.sec.rmt.service.EgovRoleManageService;
import egovframework.let.sec.rmt.service.RoleManage;
import egovframework.let.sec.rmt.service.RoleManageVO;
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
 * 롤관리에 관한 비즈니스 클래스 (JPA 전환)
 */
@Service("egovRoleManageService")
@Transactional(readOnly = true)
public class EgovRoleManageServiceImpl extends EgovAbstractServiceImpl implements EgovRoleManageService {

    @Resource
    private RoleInfoRepository roleInfoRepository;

    @Override
    @Transactional
    public RoleManageVO insertRole(RoleManage roleManage, RoleManageVO roleManageVO) throws Exception {
        RoleInfo roleInfo = RoleInfo.builder()
                .roleCode(roleManage.getRoleCode())
                .roleNm(roleManage.getRoleNm())
                .rolePttrn(roleManage.getRolePtn())
                .roleDc(roleManage.getRoleDc())
                .roleTy(roleManage.getRoleTyp())
                .roleSort(roleManage.getRoleSort())
                .build();
        roleInfoRepository.save(roleInfo);
        return roleManageVO;
    }

    @Override
    @Transactional
    public void updateRole(RoleManage roleManage) throws Exception {
        // Simple overwrite as update logic
        RoleInfo roleInfo = RoleInfo.builder()
                .roleCode(roleManage.getRoleCode())
                .roleNm(roleManage.getRoleNm())
                .rolePttrn(roleManage.getRolePtn())
                .roleDc(roleManage.getRoleDc())
                .roleTy(roleManage.getRoleTyp())
                .roleSort(roleManage.getRoleSort())
                .build();
        roleInfoRepository.save(roleInfo);
    }

    @Override
    @Transactional
    public void deleteRole(RoleManage roleManage) throws Exception {
        roleInfoRepository.deleteById(roleManage.getRoleCode());
    }

    @Override
    public int selectRoleListTotCnt(RoleManageVO roleManageVO) throws Exception {
        Pageable pageable = PageRequest.of(0, 1);
        Page<RoleInfo> page = roleInfoRepository.searchByKeyword(roleManageVO.getSearchKeyword(), pageable);
        return (int) page.getTotalElements();
    }

    @Override
    public RoleManageVO selectRole(RoleManageVO roleManageVO) throws Exception {
        return roleInfoRepository.findById(roleManageVO.getRoleCode())
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    public List<RoleManageVO> selectRoleList(RoleManageVO roleManageVO) throws Exception {
        Pageable pageable = PageRequest.of(roleManageVO.getPageIndex() - 1, roleManageVO.getPageUnit());
        Page<RoleInfo> page = roleInfoRepository.searchByKeyword(roleManageVO.getSearchKeyword(), pageable);
        return page.getContent().stream().map(this::convertToVo).collect(Collectors.toList());
    }

    @Override
    public List<RoleManageVO> selectRoleAllList(RoleManageVO roleManageVO) throws Exception {
        return roleInfoRepository.findAll().stream()
                .map(this::convertToVo)
                .collect(Collectors.toList());
    }

    private RoleManageVO convertToVo(RoleInfo entity) {
        RoleManageVO vo = new RoleManageVO();
        vo.setRoleCode(entity.getRoleCode());
        vo.setRoleNm(entity.getRoleNm());
        vo.setRolePtn(entity.getRolePttrn());
        vo.setRoleDc(entity.getRoleDc());
        vo.setRoleTyp(entity.getRoleTy());
        vo.setRoleSort(entity.getRoleSort());
        vo.setRoleCreatDe(entity.getCreatDt() != null ? entity.getCreatDt().toString() : "");
        return vo;
    }
}
