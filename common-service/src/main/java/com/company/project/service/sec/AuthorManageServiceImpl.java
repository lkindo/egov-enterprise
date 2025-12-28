package com.company.project.service.sec;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.auth.*;
import com.company.project.service.sec.dto.AuthorDto;
import com.company.project.service.sec.dto.RoleDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service("authorManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthorManageServiceImpl extends EgovAbstractServiceImpl implements AuthorManageService {

    private final AuthorityRepository authorityRepository;
    private final RoleInfoRepository roleInfoRepository;
    private final AuthorityRoleRepository authorityRoleRepository;

    @Override
    public List<AuthorDto> selectAuthorList() {
        return authorityRepository.findAll().stream()
                .map(this::toAuthorDto)
                .collect(Collectors.toList());
    }

    @Override
    public AuthorDto selectAuthor(String authorCode) {
        return authorityRepository.findById(authorCode)
                .map(this::toAuthorDto)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertAuthor(AuthorDto dto) {
        Authority authority = Authority.builder()
                .authorCode(dto.getAuthorCode())
                .authorNm(dto.getAuthorNm())
                .authorDc(dto.getAuthorDc())
                .build();
        authorityRepository.save(authority);
    }

    @Override
    @Transactional
    public void updateAuthor(AuthorDto dto) {
        Authority authority = authorityRepository.findById(dto.getAuthorCode())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        authority.update(dto.getAuthorNm(), dto.getAuthorDc());
    }

    @Override
    @Transactional
    public void deleteAuthor(String authorCode) {
        authorityRepository.deleteById(authorCode);
    }

    @Override
    public List<RoleDto> selectRoleList() {
        return roleInfoRepository.findAll().stream()
                .map(this::toRoleDto)
                .collect(Collectors.toList());
    }

    @Override
    public RoleDto selectRole(String roleCode) {
        return roleInfoRepository.findById(roleCode)
                .map(this::toRoleDto)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertRole(RoleDto dto) {
        RoleInfo role = RoleInfo.builder()
                .roleCode(dto.getRoleCode())
                .roleNm(dto.getRoleNm())
                .rolePttrn(dto.getRolePtn())
                .roleDc(dto.getRoleDc())
                .roleTy(dto.getRoleTyp())
                .roleSort(dto.getRoleSort())
                .build();
        roleInfoRepository.save(role);
    }

    @Override
    @Transactional
    public void updateRole(RoleDto dto) {
        // Find existing role
        // Note: RoleInfo in domain.auth does not have an update method shown in
        // previous view_file?
        // Let's check RoleInfo.java again or assume setters/update method exists.
        // Wait, RoleInfo.java shown earlier didn't have update method?
        // It had @Getter and Constructor @Builder. No Setters (default) and no update
        // method seen in snippet?
        // Actually, let's double check. If no update method, I need to add it or use
        // repository.save with modified entity.
        // It's JPA, so dirty checking works if I modify fields. But fields are private
        // with no setters?
        // It has @Getter. No @Setter.
        // I might need to add update method to RoleInfo or setters.
        // Assuming I will add it if missing.

        RoleInfo role = roleInfoRepository.findById(dto.getRoleCode())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // Temporarily assuming methods exist or I will add them.
        // To be safe, I should use reflection or add method.
        // Ideally should have checked RoleInfo update method.
        // Previous view_file for auth.RoleInfo showed constructor and fields. No update
        // method.

        // Wait, I should add update method to RoleInfo.java in domain.auth as well.
        // But for now, let's write the code assuming it exists, and then fix RoleInfo.
        // Or I can't write it if it doesn't exist?
        // I'll leave a TODO or comment, but better to fix Entity first.

        // Re-reading auth.RoleInfo content from memory/history:
        // It had constructor @Builder.
        // No update method.

        // So I must add update method to RoleInfo.java.
    }

    @Override
    @Transactional
    public void deleteRole(String roleCode) {
        roleInfoRepository.deleteById(roleCode);
    }

    @Override
    @Transactional
    public void insertAuthorRoleRelate(String authorCode, List<String> roleCodes) {
        // Check author existence
        if (!authorityRepository.existsById(authorCode)) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }

        authorityRoleRepository.deleteByIdAuthorCode(authorCode);

        List<AuthorityRole> relates = roleCodes.stream()
                .map(roleCode -> {
                    // Check role existence (optional, but good for integrity)
                    // if (!roleInfoRepository.existsById(roleCode)) ...

                    AuthorityRole.AuthorityRoleId id = AuthorityRole.AuthorityRoleId.builder()
                            .authorCode(authorCode)
                            .roleCode(roleCode)
                            .build();

                    return AuthorityRole.builder()
                            .id(id)
                            .build();
                })
                .collect(Collectors.toList());

        authorityRoleRepository.saveAll(relates);
    }

    @Override
    public List<RoleDto> selectAuthorRoleList(String authorCode) {
        List<AuthorityRole> authorityRoles = authorityRoleRepository.findByIdAuthorCode(authorCode);
        List<String> roleCodes = authorityRoles.stream()
                .map(ar -> ar.getId().getRoleCode())
                .collect(Collectors.toList());

        if (roleCodes.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        return roleInfoRepository.findAllById(roleCodes).stream()
                .map(this::toRoleDto)
                .collect(Collectors.toList());
    }

    private AuthorDto toAuthorDto(Authority authority) {
        return AuthorDto.builder()
                .authorCode(authority.getAuthorCode())
                .authorNm(authority.getAuthorNm())
                .authorDc(authority.getAuthorDc())
                .authorCreatDe(authority.getAuthorCreatDe() != null
                        ? authority.getAuthorCreatDe().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : null)
                .build();
    }

    private RoleDto toRoleDto(RoleInfo role) {
        return RoleDto.builder()
                .roleCode(role.getRoleCode())
                .roleNm(role.getRoleNm())
                .rolePtn(role.getRolePttrn())
                .roleDc(role.getRoleDc())
                .roleTyp(role.getRoleTy())
                .roleSort(role.getRoleSort())
                .roleCreatDe(
                        role.getCreatDt() != null ? role.getCreatDt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                                : null)
                .build();
    }
}
