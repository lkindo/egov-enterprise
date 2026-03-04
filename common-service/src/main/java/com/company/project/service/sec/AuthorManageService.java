package com.company.project.service.sec;

import com.company.project.service.sec.dto.AuthorDto;
import com.company.project.service.sec.dto.RoleDto;
import org.springframework.lang.NonNull;

import java.util.List;

public interface AuthorManageService {
    List<AuthorDto> selectAuthorList();

    AuthorDto selectAuthor(@NonNull String authorCode);

    void insertAuthor(@NonNull AuthorDto dto);

    void updateAuthor(@NonNull AuthorDto dto);

    void deleteAuthor(@NonNull String authorCode);

    List<RoleDto> selectRoleList();

    RoleDto selectRole(@NonNull String roleCode);

    void insertRole(@NonNull RoleDto dto);

    void updateRole(@NonNull RoleDto dto);

    void deleteRole(@NonNull String roleCode);

    void insertAuthorRoleRelate(@NonNull String authorCode, @NonNull List<String> roleCodes);

    List<RoleDto> selectAuthorRoleList(@NonNull String authorCode);
}