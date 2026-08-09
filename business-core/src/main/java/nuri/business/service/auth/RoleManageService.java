package nuri.business.service.auth;

import nuri.business.domain.common.BaseSearchDto;
import nuri.business.domain.auth.RoleInfo;
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
     * 목록 조회
     */
    public List<RoleManageDto> selectRoleList(BaseSearchDto searchVO) {
        Pageable pageable = searchVO.toPageable();

        Page<RoleInfo> page = roleInfoRepository.findAll(Objects.requireNonNull(pageable));
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * 목록 건수 조회
     */
    public int selectRoleListTotCnt(BaseSearchDto searchVO) {
        return (int) roleInfoRepository.count();
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
