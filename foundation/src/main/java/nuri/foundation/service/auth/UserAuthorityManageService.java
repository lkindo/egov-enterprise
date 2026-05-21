package nuri.foundation.service.auth;

import nuri.foundation.domain.auth.AuthorGroupProjection;
import nuri.foundation.domain.auth.DeptAuthorProjection;
import nuri.foundation.domain.auth.UserAuthority;
import nuri.foundation.domain.auth.UserAuthorityRepository;
import nuri.foundation.domain.common.BaseSearchDto;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.service.auth.dto.DeptAuthorBatchRequest;
import nuri.foundation.service.auth.dto.UserAuthorityDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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

    /**
     * 사용자별 권한 목록 조회
     */
    public Page<AuthorGroupProjection> selectUserAuthorityList(BaseSearchDto searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageSize = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageSize);

        return userAuthorityRepository.searchAuthorGroups(
                searchVO.getSearchCondition(),
                searchVO.getSearchKeyword(),
                pageable);
    }

    /**
     * 부서별 권한 목록 조회
     */
    public Page<DeptAuthorProjection> selectDeptAuthorityList(String deptCode, BaseSearchDto searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageSize = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageSize);

        return userAuthorityRepository.searchDeptAuthors(deptCode, pageable);
    }

    /**
     * 사용자의 권한 정보 저장/업데이트
     */
    @Transactional
    public void saveUserAuthorities(List<UserAuthorityDto> userAuthorities) {
        if (userAuthorities == null || userAuthorities.isEmpty()) {
            return;
        }

        List<UserAuthority> entities = userAuthorities.stream()
                .filter(dto -> dto.getScrtyDcsnTrgtId() != null && dto.getAuthrtId() != null)
                .map(dto -> {
                    UserAuthority existing = userAuthorityRepository.findById(dto.getScrtyDcsnTrgtId()).orElse(null);
                    if (existing != null) {
                        existing.update(dto.getAuthrtId(), dto.getMbrTypeCd());
                        return existing;
                    } else {
                        return UserAuthority.builder()
                                .scrtyDcsnTrgtId(dto.getScrtyDcsnTrgtId())
                                .authrtId(dto.getAuthrtId())
                                .mbrTypeCd(dto.getMbrTypeCd())
                                .build();
                    }
                })
                .collect(Collectors.toList());

        userAuthorityRepository.saveAll(entities);
    }

    /**
     * 사용자의 권한 삭제
     */
    @Transactional
    public void deleteUserAuthorities(List<String> uniqIds) {
        if (uniqIds == null || uniqIds.isEmpty()) {
            return;
        }
        userAuthorityRepository.deleteAllByIdInBatch(uniqIds);
    }

    /**
     * 부서별 권한 일괄 저장
     */
    @Transactional
    public void saveDeptAuthorities(DeptAuthorBatchRequest request) {
        if (request == null || request.getDeptId() == null || request.getAuthrtId() == null) {
            return;
        }

        List<String> userIds;
        if (request.isAllMembers()) {
            // 부서 내 모든 사용자 조회
            userIds = userRepository.findByOrgnztId(request.getDeptId()).stream()
                    .map(User::getEsntlId)
                    .collect(Collectors.toList());
        } else {
            userIds = request.getUserIds();
        }

        if (userIds == null || userIds.isEmpty()) {
            return;
        }

        List<UserAuthority> entities = userIds.stream()
                .map(userId -> {
                    UserAuthority existing = userAuthorityRepository.findById(userId).orElse(null);
                    if (existing != null) {
                        existing.update(request.getAuthrtId(), null); // mberTyCode는 기존 유지 또는 null
                        return existing;
                    } else {
                        return UserAuthority.builder()
                                .scrtyDcsnTrgtId(userId)
                                .authrtId(request.getAuthrtId())
                                .build();
                    }
                })
                .collect(Collectors.toList());

        userAuthorityRepository.saveAll(entities);
    }
}

