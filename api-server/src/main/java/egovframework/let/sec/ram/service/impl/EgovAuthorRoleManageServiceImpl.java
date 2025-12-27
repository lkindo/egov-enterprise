package egovframework.let.sec.ram.service.impl;

import com.company.project.domain.auth.AuthorityRole;
import com.company.project.domain.auth.AuthorRoleProjection;
import com.company.project.domain.auth.AuthorityRoleRepository;
import egovframework.let.sec.ram.service.AuthorRoleManage;
import egovframework.let.sec.ram.service.AuthorRoleManageVO;
import egovframework.let.sec.ram.service.EgovAuthorRoleManageService;
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
 * 권한별 롤 관계정보를 관리하는 ServiceImpl 클래스 (JPA 전환)
 */
@Service("egovAuthorRoleManageService")
@Transactional(readOnly = true)
public class EgovAuthorRoleManageServiceImpl extends EgovAbstractServiceImpl implements EgovAuthorRoleManageService {

    @Resource
    private AuthorityRoleRepository authorityRoleRepository;

    @Override
    public AuthorRoleManageVO selectAuthorRole(AuthorRoleManageVO authorRoleManageVO) throws Exception {
        return authorityRoleRepository
                .findById(new AuthorityRole.AuthorityRoleId(authorRoleManageVO.getAuthorCode(),
                        authorRoleManageVO.getRoleCode()))
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    public List<AuthorRoleManageVO> selectAuthorRoleList(AuthorRoleManageVO authorRoleManageVO) throws Exception {
        Pageable pageable = PageRequest.of(
                authorRoleManageVO.getFirstIndex() / authorRoleManageVO.getRecordCountPerPage(),
                authorRoleManageVO.getRecordCountPerPage());
        Page<AuthorRoleProjection> result = authorityRoleRepository
                .searchAuthorRoles(authorRoleManageVO.getAuthorCode(), pageable);
        return result.getContent().stream().map(this::convertToVo).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void insertAuthorRole(AuthorRoleManage authorRoleManage) throws Exception {
        AuthorityRole entity = AuthorityRole.builder()
                .id(new AuthorityRole.AuthorityRoleId(authorRoleManage.getAuthorCode(), authorRoleManage.getRoleCode()))
                .build();
        authorityRoleRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateAuthorRole(AuthorRoleManage authorRoleManage) throws Exception {
        // eGovFrame legacy update logic is usually insert if not exist or update
        // timestamp
        // Generally just saving the entity is enough
        insertAuthorRole(authorRoleManage);
    }

    @Override
    @Transactional
    public void deleteAuthorRole(AuthorRoleManage authorRoleManage) throws Exception {
        authorityRoleRepository.deleteById(
                new AuthorityRole.AuthorityRoleId(authorRoleManage.getAuthorCode(), authorRoleManage.getRoleCode()));
    }

    @Override
    public int selectAuthorRoleListTotCnt(AuthorRoleManageVO authorRoleManageVO) throws Exception {
        Pageable pageable = PageRequest.of(0, 1);
        Page<AuthorRoleProjection> result = authorityRoleRepository
                .searchAuthorRoles(authorRoleManageVO.getAuthorCode(), pageable);
        return (int) result.getTotalElements();
    }

    private AuthorRoleManageVO convertToVo(AuthorityRole entity) {
        AuthorRoleManageVO vo = new AuthorRoleManageVO();
        vo.setAuthorCode(entity.getId().getAuthorCode());
        vo.setRoleCode(entity.getId().getRoleCode());
        if (entity.getCreatDt() != null) {
            vo.setCreatDt(entity.getCreatDt().toString());
        }
        return vo;
    }

    private AuthorRoleManageVO convertToVo(AuthorRoleProjection projection) {
        AuthorRoleManageVO vo = new AuthorRoleManageVO();
        vo.setRoleCode(projection.getRoleCode());
        vo.setRoleNm(projection.getRoleNm());
        vo.setRolePtn(projection.getRolePtn());
        vo.setRoleDc(projection.getRoleDc());
        vo.setRoleTyp(projection.getRoleTyp());
        vo.setRoleSort(projection.getRoleSort());
        vo.setAuthorCode(projection.getAuthorCode());
        vo.setRegYn(projection.getRegYn());
        if (projection.getCreatDt() != null) {
            vo.setCreatDt(projection.getCreatDt().toString());
        }
        return vo;
    }
}
