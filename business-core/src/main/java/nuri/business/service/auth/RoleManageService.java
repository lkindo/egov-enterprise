package nuri.business.service.auth;

import nuri.business.domain.common.BaseSearchDto;
import nuri.business.domain.auth.RoleInfo;
import nuri.business.domain.auth.RoleInfoProjection;
import nuri.business.domain.auth.RoleInfoRepository;
import nuri.business.service.auth.dto.RoleManageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 권한 관리 서비스 구현체
 */
@Service("projectRoleManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoleManageService {

    private final RoleInfoRepository roleInfoRepository;

    /**
     * 목록 조회 — 검색어와 페이지를 함께 적용한다.
     *
     * <p>[2026-08-28] 종전에는 {@code findAll(pageable)} 이라 <b>검색어가 통째로 무시</b>됐고,
     * 총건수도 조건 없는 {@code count()} 였다. 화면에서 롤 명칭을 입력해도 목록도 총건수도
     * 그대로였고, 오류·로딩이 없어 무시됐다는 사실이 드러나지 않았다.
     *
     * <p>검색·페이징·건수를 모두 갖춘 QueryDSL 구현({@link RoleInfoRepositoryCustom#selectRoleList})이
     * 이미 있었고 아무도 부르지 않았을 뿐이다. 목록과 총건수를 한 {@link Page} 에서 얻어
     * 두 값이 어긋나는 축을 구조적으로 없앤다.
     */
    public Page<RoleManageDto> selectRoleList(BaseSearchDto searchVO) {
        Pageable pageable = Objects.requireNonNull(searchVO.toPageable());
        return roleInfoRepository.selectRoleList(searchVO.getSearchKeyword(), pageable)
                .map(this::toDto);
    }

    /**
     * 상세 조회
     */
    public RoleManageDto selectRole(String roleCode) {
        return roleInfoRepository.findById(Objects.requireNonNull(roleCode))
                .map(this::toDto)
                .orElse(null);
    }

    /**
     * 등록
     */
    @Transactional
    public void insertRole(RoleManageDto dto) {
        String roleId = dto.getRoleId();
        if (roleId == null || roleId.isEmpty()) {
            roleId = nuri.foundation.core.util.IdGenerationUtil.generateId("ROLE_", 8);
        }

        RoleInfo entity = RoleInfo.builder()
                .roleId(roleId)
                .roleNm(dto.getRoleNm())
                .rolePatrn(dto.getRolePatrn())
                .roleExpln(dto.getRoleExpln())
                .roleTypeCd(dto.getRoleTypeCd())
                .roleSort(dto.getRoleSort() != null && !dto.getRoleSort().isEmpty() ? Integer.parseInt(dto.getRoleSort()) : null)
                .build();
        roleInfoRepository.save(Objects.requireNonNull(entity));
    }

    /**
     * 수정
     */
    @Transactional
    public void updateRole(RoleManageDto dto) {
        roleInfoRepository.findById(Objects.requireNonNull(dto.getRoleId())).ifPresent(entity -> {
            entity.update(dto.getRoleNm(), dto.getRolePatrn(), dto.getRoleExpln(), dto.getRoleTypeCd(), 
                dto.getRoleSort() != null && !dto.getRoleSort().isEmpty() ? Integer.parseInt(dto.getRoleSort()) : null);
        });
    }

    /**
     * 삭제
     */
    @Transactional
    public void deleteRole(String roleCode) {
        roleInfoRepository.deleteById(Objects.requireNonNull(roleCode));
    }

    /**
     * 다중 삭제
     */
    @Transactional
    public void deleteRoles(String[] roleCodes) {
        roleInfoRepository
                .deleteAllByIdInBatch(Objects.requireNonNull(Arrays.asList(Objects.requireNonNull(roleCodes))));
    }

    private RoleManageDto toDto(RoleInfoProjection projection) {
        return RoleManageDto.builder()
                .roleId(projection.getRoleId())
                .roleNm(projection.getRoleNm())
                .rolePatrn(projection.getRolePatrn())
                .roleExpln(projection.getRoleExpln())
                .roleTypeCd(projection.getRoleTypeCd())
                .roleSort(projection.getRoleSort() != null ? projection.getRoleSort().toString() : null)
                .crtDt(projection.getCrtDt() != null ? projection.getCrtDt().toString() : null)
                .build();
    }

    private RoleManageDto toDto(RoleInfo entity) {
        return RoleManageDto.builder()
                .roleId(entity.getRoleId())
                .roleNm(entity.getRoleNm())
                .rolePatrn(entity.getRolePatrn())
                .roleExpln(entity.getRoleExpln())
                .roleTypeCd(entity.getRoleTypeCd())
                .roleSort(entity.getRoleSort() != null ? entity.getRoleSort().toString() : null)
                .crtDt(entity.getCrtDt() != null ? entity.getCrtDt().toString() : null)
                .build();
    }
}
