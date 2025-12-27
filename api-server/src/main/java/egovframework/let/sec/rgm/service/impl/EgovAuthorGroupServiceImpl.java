package egovframework.let.sec.rgm.service.impl;

import com.company.project.domain.auth.AuthorGroupProjection;
import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
import egovframework.let.sec.rgm.service.AuthorGroup;
import egovframework.let.sec.rgm.service.AuthorGroupVO;
import egovframework.let.sec.rgm.service.EgovAuthorGroupService;
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
 * 권한그룹에 관한 ServiceImpl 클래스 (JPA 전환)
 */
@Service("egovAuthorGroupService")
@Transactional(readOnly = true)
public class EgovAuthorGroupServiceImpl extends EgovAbstractServiceImpl implements EgovAuthorGroupService {

    @Resource
    private UserAuthorityRepository userAuthorityRepository;

    @Override
    public List<AuthorGroupVO> selectAuthorGroupList(AuthorGroupVO authorGroupVO) throws Exception {
        Pageable pageable = PageRequest.of(authorGroupVO.getFirstIndex() / authorGroupVO.getRecordCountPerPage(),
                authorGroupVO.getRecordCountPerPage());
        Page<AuthorGroupProjection> result = userAuthorityRepository.searchAuthorGroups(
                authorGroupVO.getSearchCondition(),
                authorGroupVO.getSearchKeyword(), pageable);
        return result.getContent().stream().map(this::convertToVo).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void insertAuthorGroup(AuthorGroup authorGroup) throws Exception {
        UserAuthority entity = UserAuthority.builder()
                .uniqId(authorGroup.getUniqId())
                .authorCode(authorGroup.getAuthorCode())
                .mberTyCode(authorGroup.getMberTyCode())
                .build();
        userAuthorityRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateAuthorGroup(AuthorGroup authorGroup) throws Exception {
        userAuthorityRepository.findById(authorGroup.getUniqId())
                .ifPresentOrElse(
                        entity -> entity.update(authorGroup.getAuthorCode(), authorGroup.getMberTyCode()),
                        () -> {
                            try {
                                insertAuthorGroup(authorGroup);
                            } catch (Exception ignored) {
                            }
                        });
    }

    @Override
    @Transactional
    public void deleteAuthorGroup(AuthorGroup authorGroup) throws Exception {
        userAuthorityRepository.deleteById(authorGroup.getUniqId());
    }

    @Override
    public int selectAuthorGroupListTotCnt(AuthorGroupVO authorGroupVO) throws Exception {
        Pageable pageable = PageRequest.of(0, 1);
        Page<AuthorGroupProjection> result = userAuthorityRepository.searchAuthorGroups(
                authorGroupVO.getSearchCondition(),
                authorGroupVO.getSearchKeyword(), pageable);
        return (int) result.getTotalElements();
    }

    private AuthorGroupVO convertToVo(AuthorGroupProjection projection) {
        AuthorGroupVO vo = new AuthorGroupVO();
        vo.setUserId(projection.getUserId());
        vo.setUserNm(projection.getUserNm());
        vo.setGroupId(projection.getGroupId());
        vo.setMberTyCode(projection.getMberTyCode());
        vo.setMberTyNm(projection.getMberTyNm());
        vo.setAuthorCode(projection.getAuthorCode());
        vo.setRegYn(projection.getRegYn());
        vo.setUniqId(projection.getUniqId());
        return vo;
    }
}
