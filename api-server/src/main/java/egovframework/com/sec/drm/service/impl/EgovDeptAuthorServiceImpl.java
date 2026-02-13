package egovframework.com.sec.drm.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.auth.DeptAuthorProjection;
import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.user.DeptManage;
import com.company.project.domain.user.DeptManageRepository;

import egovframework.com.sec.drm.service.DeptAuthor;
import egovframework.com.sec.drm.service.DeptAuthorVO;
import egovframework.com.sec.drm.service.EgovDeptAuthorService;
import jakarta.annotation.Resource;

/**
 * 부서권한에 관한 ServiceImpl 클래스를 정의한다. (Modernized)
 */
@Service("egovDeptAuthorService")
public class EgovDeptAuthorServiceImpl extends EgovAbstractServiceImpl implements EgovDeptAuthorService {

    @Resource
    private UserAuthorityRepository userAuthorityRepository;

    @Resource
    private DeptManageRepository deptManageRepository;

    /**
     * 부서별 할당된 권한목록 조회
     */
    @Override
    @Transactional(readOnly = true)
    public List<DeptAuthorVO> selectDeptAuthorList(DeptAuthorVO deptAuthorVO) throws Exception {
        Pageable pageable = PageRequest.of(deptAuthorVO.getFirstIndex() / deptAuthorVO.getRecordCountPerPage(),
                deptAuthorVO.getRecordCountPerPage());
        Page<DeptAuthorProjection> page = userAuthorityRepository.searchDeptAuthors(deptAuthorVO.getDeptCode(),
                pageable);
        return page.getContent().stream().map(this::mapToVO).collect(Collectors.toList());
    }

    /**
     * 부서에 해당하는 사용자에게 시스템 메뉴/접근권한을 일괄 할당
     */
    @Override
    @Transactional
    public void insertDeptAuthor(DeptAuthor deptAuthor) throws Exception {
        UserAuthority entity = UserAuthority.builder()
                .uniqId(deptAuthor.getUniqId())
                .authorCode(deptAuthor.getAuthorCode())
                .build();
        userAuthorityRepository.save(entity);
    }

    /**
     * 부서별 시스템 메뉴 접근권한을 수정
     */
    @Override
    @Transactional
    public void updateDeptAuthor(DeptAuthor deptAuthor) throws Exception {
        userAuthorityRepository.findById(deptAuthor.getUniqId()).ifPresent(entity -> {
            entity.update(deptAuthor.getAuthorCode(), entity.getMberTyCode());
        });
    }

    /**
     * 불필요한 부서권한 삭제
     */
    @Override
    @Transactional
    public void deleteDeptAuthor(DeptAuthor deptAuthor) throws Exception {
        userAuthorityRepository.deleteById(deptAuthor.getUniqId());
    }

    /**
     * 부서권한 목록조회 카운트
     */
    @Override
    @Transactional(readOnly = true)
    public int selectDeptAuthorListTotCnt(DeptAuthorVO deptAuthorVO) throws Exception {
        Page<DeptAuthorProjection> page = userAuthorityRepository.searchDeptAuthors(deptAuthorVO.getDeptCode(),
                PageRequest.of(0, 1));
        return (int) page.getTotalElements();
    }

    /**
     * 부서목록 조회
     */
    @Override
    @Transactional(readOnly = true)
    public List<DeptAuthorVO> selectDeptList(DeptAuthorVO deptAuthorVO) throws Exception {
        Pageable pageable = PageRequest.of(deptAuthorVO.getFirstIndex() / deptAuthorVO.getRecordCountPerPage(),
                deptAuthorVO.getRecordCountPerPage());
        Page<DeptManage> page = deptManageRepository.searchDeptManages(deptAuthorVO.getSearchKeyword(), pageable);
        return page.getContent().stream().map(this::mapDeptToVO).collect(Collectors.toList());
    }

    /**
     * 부서 목록조회 카운트
     */
    @Override
    @Transactional(readOnly = true)
    public int selectDeptListTotCnt(DeptAuthorVO deptAuthorVO) throws Exception {
        Page<DeptManage> page = deptManageRepository.searchDeptManages(deptAuthorVO.getSearchKeyword(),
                PageRequest.of(0, 1));
        return (int) page.getTotalElements();
    }

    private DeptAuthorVO mapToVO(DeptAuthorProjection projection) {
        DeptAuthorVO vo = new DeptAuthorVO();
        vo.setDeptCode(projection.getDeptCode());
        vo.setDeptNm(projection.getDeptNm());
        vo.setUserId(projection.getUserId());
        vo.setUserNm(projection.getUserNm());
        vo.setAuthorCode(projection.getAuthorCode());
        vo.setUniqId(projection.getUniqId());
        vo.setRegYn(projection.getRegYn());
        return vo;
    }

    private DeptAuthorVO mapDeptToVO(DeptManage entity) {
        DeptAuthorVO vo = new DeptAuthorVO();
        vo.setDeptCode(entity.getOrgnztId());
        vo.setDeptNm(entity.getOrgnztNm());
        return vo;
    }
}
