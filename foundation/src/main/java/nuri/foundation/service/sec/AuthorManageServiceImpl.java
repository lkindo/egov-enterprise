package nuri.foundation.service.sec;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.domain.auth.*;
import nuri.foundation.service.sec.dto.AuthorDto;
import nuri.foundation.service.sec.dto.RoleDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
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
    public AuthorDto selectAuthor(@NonNull String authorCode) {
        return authorityRepository.findById(Objects.requireNonNull(authorCode))
                .map(this::toAuthorDto)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertAuthor(@NonNull AuthorDto dto) {
        Objects.requireNonNull(dto);
        Authority authority = Authority.builder()
                .authorCode(Objects.requireNonNull(dto.getAuthorCode()))
                .authorNm(Objects.requireNonNull(dto.getAuthorNm()))
                .authorDc(dto.getAuthorDc())
                .build();
        authorityRepository.save(Objects.requireNonNull(authority));
    }

    @Override
    @Transactional
    public void updateAuthor(@NonNull AuthorDto dto) {
        Objects.requireNonNull(dto);
        Authority authority = authorityRepository.findById(Objects.requireNonNull(dto.getAuthorCode()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        authority.update(Objects.requireNonNull(dto.getAuthorNm()), dto.getAuthorDc());
    }

    @Override
    @Transactional
    public void deleteAuthor(@NonNull String authorCode) {
        authorityRepository.deleteById(Objects.requireNonNull(authorCode));
    }

    @Override
    public List<RoleDto> selectRoleList() {
        return roleInfoRepository.findAll().stream()
                .map(this::toRoleDto)
                .collect(Collectors.toList());
    }

    @Override
    public RoleDto selectRole(@NonNull String roleCode) {
        return roleInfoRepository.findById(Objects.requireNonNull(roleCode))
                .map(this::toRoleDto)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertRole(@NonNull RoleDto dto) {
        Objects.requireNonNull(dto);
        RoleInfo role = RoleInfo.builder()
                .roleCode(Objects.requireNonNull(dto.getRoleCode()))
                .roleNm(Objects.requireNonNull(dto.getRoleNm()))
                .rolePttrn(dto.getRolePtn())
                .roleDc(dto.getRoleDc())
                .roleTy(dto.getRoleTyp())
                .roleSort(dto.getRoleSort() != null && !dto.getRoleSort().isEmpty() ? Integer.parseInt(dto.getRoleSort()) : null)
                .build();
        roleInfoRepository.save(Objects.requireNonNull(role));
    }

    @Override
    @Transactional
    public void updateRole(@NonNull RoleDto dto) {
        Objects.requireNonNull(dto);
        RoleInfo role = roleInfoRepository.findById(Objects.requireNonNull(dto.getRoleCode()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        role.update(Objects.requireNonNull(dto.getRoleNm()), dto.getRolePtn(), dto.getRoleDc(), dto.getRoleTyp(),
                dto.getRoleSort() != null && !dto.getRoleSort().isEmpty() ? Integer.parseInt(dto.getRoleSort()) : null);
    }

    @Override
    @Transactional
    public void deleteRole(@NonNull String roleCode) {
        roleInfoRepository.deleteById(Objects.requireNonNull(roleCode));
    }

    @Override
    @Transactional
    public void insertAuthorRoleRelate(@NonNull String authorCode, @NonNull List<String> roleCodes) {
        Objects.requireNonNull(authorCode);
        Objects.requireNonNull(roleCodes);

        if (!authorityRepository.existsById(authorCode)) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }

        authorityRoleRepository.deleteByIdAuthorCode(authorCode);

        List<AuthorityRole> relates = roleCodes.stream()
                .map(roleCode -> {
                    AuthorityRole.AuthorityRoleId id = AuthorityRole.AuthorityRoleId.builder()
                            .authorCode(authorCode)
                            .roleCode(roleCode)
                            .build();

                    return AuthorityRole.builder()
                            .id(id)
                            .build();
                })
                .collect(Collectors.toList());

        authorityRoleRepository.saveAll(Objects.requireNonNull(relates));
    }

    @Override
    public List<RoleDto> selectAuthorRoleList(@NonNull String authorCode) {
        List<AuthorityRole> authorityRoles = authorityRoleRepository
                .findByIdAuthorCode(Objects.requireNonNull(authorCode));
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
        String createdDe = authority.getAuthorCreatDe();
        if (createdDe != null) {
            createdDe = createdDe.trim();
            if (createdDe.length() == 8 && !createdDe.contains("-")) {
                createdDe = createdDe.substring(0, 4) + "-" + createdDe.substring(4, 6) + "-" + createdDe.substring(6, 8);
            }
        }
        return AuthorDto.builder()
                .authorCode(Objects.requireNonNull(authority.getAuthorCode()))
                .authorNm(Objects.requireNonNull(authority.getAuthorNm()))
                .authorDc(authority.getAuthorDc())
                .authorCreatDe(createdDe)
                .build();
    }

    private RoleDto toRoleDto(RoleInfo role) {
        return RoleDto.builder()
                .roleCode(Objects.requireNonNull(role.getRoleCode()))
                .roleNm(Objects.requireNonNull(role.getRoleNm()))
                .rolePtn(role.getRolePttrn())
                .roleDc(role.getRoleDc())
                .roleTyp(role.getRoleTy())
                .roleSort(role.getRoleSort() != null ? role.getRoleSort().toString() : null)
                .roleCreatDe(role.getCreatedDate() != null ? role.getCreatedDate().toString() : null)
                .build();
    }
}
