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
        if (userAuthorities == null || userAuthorities.isEmpty()) {
            return;
        }

        List<UserAuthorityDto> valid = userAuthorities.stream()
                .filter(dto -> dto.getScrtyDcsnTrgtId() != null && dto.getAuthrtId() != null)
                .collect(Collectors.toList());
        assertAuthoritiesExist(valid.stream().map(UserAuthorityDto::getAuthrtId).toList());
        // 항목별 findById N+1 을 findAllById 배치 조회로 제거.
        List<String> ids = valid.stream().map(dto -> dto.getScrtyDcsnTrgtId()).collect(Collectors.toList());
        java.util.Map<String, UserAuthority> existingMap = ids.isEmpty()
                ? java.util.Collections.emptyMap()
                : userAuthorityRepository.findAllById(ids).stream()
                        .collect(Collectors.toMap(a -> a.getScrtyDcsnTrgtId(), a -> a, (a, b) -> a));

        List<UserAuthority> entities = valid.stream()
                .map(dto -> {
                    UserAuthority existing = existingMap.get(dto.getScrtyDcsnTrgtId());
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
     * 존재하지 않는 권한 코드로의 할당을 거부한다.
     *
     * <p><b>왜 필요한가</b> — {@code tb_user_authrt_map} 에는 {@code tb_authrt_info} 로의 FK 가
     * 없고(V2_0 은 PK 만, V2_12 는 {@code tb_user_info} FK 만 추가), JPA 연관도
     * {@code ConstraintMode.NO_CONSTRAINT} 로 FK 생성을 끈다. 즉 어떤 문자열이든 저장된다.
     *
     * <p>2026-08-29 에 <b>삭제</b> 쪽은 보유자가 있으면 막도록 했지만, 쓰기 쪽에는 검증이 전혀
     * 없어 <b>정규 관리자 API 로 같은 끊긴 참조를 그대로 만들 수 있었다</b> — 우회가 아니라
     * 정상 경로로. 다른 탭이 들고 있던 옛 목록에서 이미 지워진 코드를 저장하면 그대로 남고,
     * 나중에 같은 코드로 권한을 다시 만들면 아무도 배정하지 않은 사용자가 그것을 물려받는다.
     * 삭제만 막는 것은 문을 한쪽만 잠그는 것이다.
     */
    private void assertAuthoritiesExist(List<String> authrtIds) {
        List<String> distinct = authrtIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (distinct.isEmpty()) {
            return;
        }
        java.util.Set<String> known = authorityRepository.findAllById(distinct).stream()
                .map(authority -> authority.getAuthrtCd())
                .collect(java.util.stream.Collectors.toSet());
        List<String> unknown = distinct.stream().filter(id -> !known.contains(id)).toList();
        if (!unknown.isEmpty()) {
            throw new BusinessException(
                    "존재하지 않는 권한입니다: " + String.join(", ", unknown),
                    CommonErrorCode.INVALID_INPUT_VALUE);
        }
    }

    /**
     * 부서별 권한 일괄 저장
     */
    @Transactional
    public void saveDeptAuthorities(DeptAuthorBatchRequest request) {
        if (request == null || request.getDeptId() == null || request.getAuthrtId() == null) {
            return;
        }

        assertAuthoritiesExist(List.of(request.getAuthrtId()));

        List<String> userIds;
        if (request.isAllMembers()) {
            // 부서 내 모든 사용자 조회
            userIds = userRepository.findByOgnzId(request.getDeptId()).stream()
                    .map(user -> user.getEsntlId())
                    .collect(Collectors.toList());
        } else {
            userIds = request.getUserIds();
        }

        if (userIds == null || userIds.isEmpty()) {
            return;
        }

        // 사용자별 findById N+1 을 findAllById 배치 조회로 제거.
        java.util.Map<String, UserAuthority> existingMap = userAuthorityRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(a -> a.getScrtyDcsnTrgtId(), a -> a, (a, b) -> a));

        List<UserAuthority> entities = userIds.stream()
                .map(userId -> {
                    UserAuthority existing = existingMap.get(userId);
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

