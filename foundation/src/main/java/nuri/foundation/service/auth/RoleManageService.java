package nuri.foundation.service.auth;

import nuri.foundation.domain.common.BaseSearchDto;
import nuri.foundation.domain.auth.RoleInfo;
import nuri.foundation.domain.auth.RoleInfoRepository;
import nuri.foundation.service.auth.dto.RoleManageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
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
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);

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
        String roleCode = dto.getRoleCode();
        if (roleCode == null || roleCode.isEmpty()) {
            roleCode = "ROLE_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }

        RoleInfo entity = RoleInfo.builder()
                .roleId(roleCode)
                .roleNm(dto.getRoleNm())
                .rolePatrn(dto.getRolePttrn())
                .roleExpln(dto.getRoleDc())
                .roleTypeCd(dto.getRoleTy())
                .roleSort(dto.getRoleSort() != null && !dto.getRoleSort().isEmpty() ? Integer.parseInt(dto.getRoleSort()) : null)
                .build();
        roleInfoRepository.save(Objects.requireNonNull(entity));
    }

    /**
     * 수정
     */
    @Transactional
    public void updateRole(RoleManageDto dto) {
        roleInfoRepository.findById(Objects.requireNonNull(dto.getRoleCode())).ifPresent(entity -> {
            entity.update(dto.getRoleNm(), dto.getRolePttrn(), dto.getRoleDc(), dto.getRoleTy(), 
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
                .roleCode(entity.getRoleId())
                .roleNm(entity.getRoleNm())
                .rolePttrn(entity.getRolePatrn())
                .roleDc(entity.getRoleExpln())
                .roleTy(entity.getRoleTypeCd())
                .roleSort(entity.getRoleSort() != null ? entity.getRoleSort().toString() : null)
                .creatDt(entity.getCreatedDate() != null ? entity.getCreatedDate().toString() : null)
                .build();
    }
}
