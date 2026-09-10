package nuri.business.service.auth;

import nuri.business.domain.auth.AuthorGroupProjection;
import nuri.business.domain.auth.DeptAuthorProjection;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.auth.AuthorityRepository;
import nuri.business.domain.auth.UserAuthority;
import nuri.business.domain.auth.UserAuthorityRepository;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.auth.dto.DeptAuthorBatchRequest;
import nuri.business.service.auth.dto.UserAuthorityDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 사용자-권한 매핑 관계를 관리하는 서비스
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserAuthorityManageService {

    private final UserAuthorityRepository userAuthorityRepository;
    private final UserRepository userRepository;
    private final AuthorityRepository authorityRepository;

    /**
     * 사용자별 권한 목록 조회
     */
    public Page<AuthorGroupProjection> selectUserAuthorityList(BaseSearchDto searchVO) {
        Pageable pageable = searchVO.toPageable();

        return userAuthorityRepository.searchAuthorGroups(
                searchVO.getSearchCondition(),
                searchVO.getSearchKeyword(),
                pageable);
    }

    /** 선택한 권한에 대한 사용자별 할당 여부를 조회한다. */
    public Page<AuthorGroupProjection> selectUserAuthorityList(String authorCode, BaseSearchDto searchVO) {
        Pageable pageable = searchVO.toPageable();
        return userAuthorityRepository.searchAuthorGroups(
                searchVO.getSearchCondition(),
                searchVO.getSearchKeyword(),
                authorCode,
                pageable);
    }

    /**
     * 부서별 권한 목록 조회
     */
    public Page<DeptAuthorProjection> selectDeptAuthorityList(String deptCode, BaseSearchDto searchVO) {
        Pageable pageable = searchVO.toPageable();

        return userAuthorityRepository.searchDeptAuthors(deptCode, pageable);
    }

    /**
     * 사용자의 권한 정보 저장/업데이트
     */
    @Transactional
    public void saveUserAuthorities(List<UserAuthorityDto> userAuthorities) {
        nuri.business.security.util.SecurityUtil.assertPermission("AUTHRT_ASSIGN");
        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "전체 배정과 버전을 포함하는 /admin/authorization API를 사용해 주세요.");
    }

    /**
     * 사용자의 권한 삭제
     */
    @Transactional
    public void deleteUserAuthorities(List<String> uniqIds) {
        nuri.business.security.util.SecurityUtil.assertPermission("AUTHRT_ASSIGN");
        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "전체 배정과 버전을 포함하는 /admin/authorization API를 사용해 주세요.");
    }

    /**
     * 부서별 권한 일괄 저장
     */
    @Transactional
    public void saveDeptAuthorities(DeptAuthorBatchRequest request) {
        nuri.business.security.util.SecurityUtil.assertPermission("AUTHRT_ASSIGN");
        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "전체 배정과 버전을 포함하는 /admin/authorization API를 사용해 주세요.");
    }
}

