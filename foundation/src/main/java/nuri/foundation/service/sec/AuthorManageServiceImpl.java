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
    public AuthorDto selectAuthor(@NonNull String authrtCd) {
        return authorityRepository.findById(Objects.requireNonNull(authrtCd))
                .map(this::toAuthorDto)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertAuthor(@NonNull AuthorDto dto) {
        Objects.requireNonNull(dto);
        Authority authority = Authority.builder()
                .authrtCd(Objects.requireNonNull(dto.getAuthrtCd()))
                .authrtNm(Objects.requireNonNull(dto.getAuthrtNm()))
                .authrtExpln(dto.getAuthrtExpln())
                .build();
        authorityRepository.save(Objects.requireNonNull(authority));
    }

    @Override
    @Transactional
    public void updateAuthor(@NonNull AuthorDto dto) {
        Objects.requireNonNull(dto);
        Authority authority = authorityRepository.findById(Objects.requireNonNull(dto.getAuthrtCd()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        authority.update(Objects.requireNonNull(dto.getAuthrtNm()), dto.getAuthrtExpln());
    }

    @Override
    @Transactional
    public void deleteAuthor(@NonNull String authrtCd) {
        authorityRepository.deleteById(Objects.requireNonNull(authrtCd));
    }

    @Override
    public List<RoleDto> selectRoleList() {
        return roleInfoRepository.findAll().stream()
                .map(this::toRoleDto)
                .collect(Collectors.toList());
    }

    @Override
    public RoleDto selectRole(@NonNull String roleId) {
        return roleInfoRepository.findById(Objects.requireNonNull(roleId))
                .map(this::toRoleDto)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertRole(@NonNull RoleDto dto) {
        Objects.requireNonNull(dto);
        RoleInfo role = RoleInfo.builder()
                .roleId(Objects.requireNonNull(dto.getRoleId()))
                .roleNm(Objects.requireNonNull(dto.getRoleNm()))
                .rolePatrn(dto.getRolePatrn())
                .roleExpln(dto.getRoleExpln())
                .roleTypeCd(dto.getRoleTypeCd())
                .roleSort(dto.getRoleSort() != null && !dto.getRoleSort().isEmpty() ? Integer.parseInt(dto.getRoleSort()) : null)
                .build();
        roleInfoRepository.save(Objects.requireNonNull(role));
    }

    @Override
    @Transactional
    public void updateRole(@NonNull RoleDto dto) {
        Objects.requireNonNull(dto);
        RoleInfo role = roleInfoRepository.findById(Objects.requireNonNull(dto.getRoleId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        role.update(Objects.requireNonNull(dto.getRoleNm()), dto.getRolePatrn(), dto.getRoleExpln(), dto.getRoleTypeCd(),
                dto.getRoleSort() != null && !dto.getRoleSort().isEmpty() ? Integer.parseInt(dto.getRoleSort()) : null);
    }

    @Override
    @Transactional
    public void deleteRole(@NonNull String roleId) {
        roleInfoRepository.deleteById(Objects.requireNonNull(roleId));
    }

    @Override
    @Transactional
    public void insertAuthorRoleRelate(@NonNull String authrtCd, @NonNull List<String> roleCodes) {
        Objects.requireNonNull(authrtCd);
        Objects.requireNonNull(roleCodes);

        if (!authorityRepository.existsById(authrtCd)) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }

        authorityRoleRepository.deleteByIdAuthrtCd(authrtCd);

        List<AuthorityRole> relates = roleCodes.stream()
                .map(roleCode -> {
                    AuthorityRole.AuthorityRoleId id = AuthorityRole.AuthorityRoleId.builder()
                            .authrtCd(authrtCd)
                            .roleCd(roleCode)
                            .build();

                    return AuthorityRole.builder()
                            .id(id)
                            .build();
                })
                .collect(Collectors.toList());

        authorityRoleRepository.saveAll(Objects.requireNonNull(relates));
    }

    @Override
    public List<RoleDto> selectAuthorRoleList(@NonNull String authrtCd) {
        List<AuthorityRole> authorityRoles = authorityRoleRepository
                .findByIdAuthrtCd(Objects.requireNonNull(authrtCd));
        List<String> roleCodes = authorityRoles.stream()
                .map(ar -> ar.getId().getRoleCd())
                .collect(Collectors.toList());

        if (roleCodes.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        return roleInfoRepository.findAllById(roleCodes).stream()
                .map(this::toRoleDto)
                .collect(Collectors.toList());
    }

    private AuthorDto toAuthorDto(Authority authority) {
        String createdDe = authority.getAuthrtCrtYmd();
        if (createdDe != null) {
            createdDe = createdDe.trim();
            if (createdDe.length() == 8 && !createdDe.contains("-")) {
                createdDe = createdDe.substring(0, 4) + "-" + createdDe.substring(4, 6) + "-" + createdDe.substring(6, 8);
            }
        }
        return AuthorDto.builder()
                .authrtCd(Objects.requireNonNull(authority.getAuthrtCd()))
                .authrtNm(Objects.requireNonNull(authority.getAuthrtNm()))
                .authrtExpln(authority.getAuthrtExpln())
                .authrtCrtYmd(createdDe)
                .build();
    }

    private RoleDto toRoleDto(RoleInfo role) {
        return RoleDto.builder()
                .roleId(Objects.requireNonNull(role.getRoleId()))
                .roleNm(Objects.requireNonNull(role.getRoleNm()))
                .rolePatrn(role.getRolePatrn())
                .roleExpln(role.getRoleExpln())
                .roleTypeCd(role.getRoleTypeCd())
                .roleSort(role.getRoleSort() != null ? role.getRoleSort().toString() : null)
                .roleCreatDe(role.getCreatedDate() != null ? role.getCreatedDate().toString() : null)
                .build();
    }
}
