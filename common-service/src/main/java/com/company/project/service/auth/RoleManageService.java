package com.company.project.service.auth;

import com.company.project.domain.auth.RoleInfo;
import com.company.project.domain.auth.RoleInfoRepository;
import com.company.project.service.auth.dto.RoleManageDto;
import egovframework.com.cmm.ComDefaultVO;
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
 * 濡?愿由??쒕퉬??
 */
@Service("projectRoleManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoleManageService {

    private final RoleInfoRepository roleInfoRepository;

    /**
     * 濡?紐⑸줉 議고쉶
     */
    public List<RoleManageDto> selectRoleList(ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);

        Page<RoleInfo> page = roleInfoRepository.findAll(Objects.requireNonNull(pageable));
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * 濡?紐⑸줉 珥?嫄댁닔
     */
    public int selectRoleListTotCnt(ComDefaultVO searchVO) {
        return (int) roleInfoRepository.count();
    }

    /**
     * 濡??곸꽭 議고쉶
     */
    public RoleManageDto selectRole(String roleCode) {
        return roleInfoRepository.findById(Objects.requireNonNull(roleCode))
                .map(this::toDto)
                .orElse(null);
    }

    /**
     * 濡??깅줉
     */
    @Transactional
    public void insertRole(RoleManageDto dto) {
        String roleCode = dto.getRoleCode();
        if (roleCode == null || roleCode.isEmpty()) {
            roleCode = "ROLE_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }

        RoleInfo entity = RoleInfo.builder()
                .roleCode(roleCode)
                .roleNm(dto.getRoleNm())
                .rolePttrn(dto.getRolePttrn())
                .roleDc(dto.getRoleDc())
                .roleTy(dto.getRoleTy())
                .roleSort(dto.getRoleSort())
                .build();
        roleInfoRepository.save(Objects.requireNonNull(entity));
    }

    /**
     * 濡??섏젙
     */
    @Transactional
    public void updateRole(RoleManageDto dto) {
        roleInfoRepository.findById(Objects.requireNonNull(dto.getRoleCode())).ifPresent(entity -> {
            entity.update(dto.getRoleNm(), dto.getRolePttrn(), dto.getRoleDc(), dto.getRoleTy(), dto.getRoleSort());
        });
    }

    /**
     * 濡???젣
     */
    @Transactional
    public void deleteRole(String roleCode) {
        roleInfoRepository.deleteById(Objects.requireNonNull(roleCode));
    }

    /**
     * 濡??ㅼ쨷 ??젣
     */
    @Transactional
    public void deleteRoles(String[] roleCodes) {
        roleInfoRepository
                .deleteAllByIdInBatch(Objects.requireNonNull(Arrays.asList(Objects.requireNonNull(roleCodes))));
    }

    private RoleManageDto toDto(RoleInfo entity) {
        return RoleManageDto.builder()
                .roleCode(entity.getRoleCode())
                .roleNm(entity.getRoleNm())
                .rolePttrn(entity.getRolePttrn())
                .roleDc(entity.getRoleDc())
                .roleTy(entity.getRoleTy())
                .roleSort(entity.getRoleSort())
                .creatDt(entity.getCreatDt())
                .build();
    }
}
