package egovframework.let.sec.ram.service.impl;

import com.company.project.domain.auth.Authority;
import com.company.project.domain.auth.AuthorityRepository;
import egovframework.let.sec.ram.service.AuthorManage;
import egovframework.let.sec.ram.service.AuthorManageVO;
import egovframework.let.sec.ram.service.EgovAuthorManageService;
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
 * 권한관리에 관한 ServiceImpl 클래스 (JPA 전환)
 */
@Service("egovAuthorManageService")
@Transactional(readOnly = true)
public class EgovAuthorManageServiceImpl extends EgovAbstractServiceImpl implements EgovAuthorManageService {

    @Resource
    private AuthorityRepository authorityRepository;

    @Override
    public List<AuthorManageVO> selectAuthorList(AuthorManageVO authorManageVO) throws Exception {
        Pageable pageable = PageRequest.of(authorManageVO.getFirstIndex() / authorManageVO.getRecordCountPerPage(),
                authorManageVO.getRecordCountPerPage());
        Page<Authority> result = authorityRepository.searchAuthorities(authorManageVO.getSearchCondition(),
                authorManageVO.getSearchKeyword(), pageable);
        return result.getContent().stream().map(this::convertToVo).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void insertAuthor(AuthorManage authorManage) throws Exception {
        Authority entity = Authority.builder()
                .authorCode(authorManage.getAuthorCode())
                .authorNm(authorManage.getAuthorNm())
                .authorDc(authorManage.getAuthorDc())
                .build();
        authorityRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateAuthor(AuthorManage authorManage) throws Exception {
        authorityRepository.findById(authorManage.getAuthorCode())
                .ifPresent(entity -> entity.update(authorManage.getAuthorNm(), authorManage.getAuthorDc()));
    }

    @Override
    @Transactional
    public void deleteAuthor(AuthorManage authorManage) throws Exception {
        authorityRepository.deleteById(authorManage.getAuthorCode());
    }

    @Override
    public AuthorManageVO selectAuthor(AuthorManageVO authorManageVO) throws Exception {
        return authorityRepository.findById(authorManageVO.getAuthorCode())
                .map(this::convertToVo)
                .orElseThrow(() -> processException("info.nodata.msg"));
    }

    @Override
    public int selectAuthorListTotCnt(AuthorManageVO authorManageVO) throws Exception {
        Pageable pageable = PageRequest.of(0, 1);
        Page<Authority> result = authorityRepository.searchAuthorities(authorManageVO.getSearchCondition(),
                authorManageVO.getSearchKeyword(), pageable);
        return (int) result.getTotalElements();
    }

    @Override
    public List<AuthorManageVO> selectAuthorAllList(AuthorManageVO authorManageVO) throws Exception {
        return authorityRepository.findAll().stream()
                .map(this::convertToVo)
                .collect(Collectors.toList());
    }

    private AuthorManageVO convertToVo(Authority entity) {
        AuthorManageVO vo = new AuthorManageVO();
        vo.setAuthorCode(entity.getAuthorCode());
        vo.setAuthorNm(entity.getAuthorNm());
        vo.setAuthorDc(entity.getAuthorDc());
        if (entity.getAuthorCreatDe() != null) {
            vo.setAuthorCreatDe(entity.getAuthorCreatDe().toString());
        }
        return vo;
    }
}
