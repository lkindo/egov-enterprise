package com.company.project.service.sec;

import com.company.project.service.sec.dto.AuthorDto;
import com.company.project.service.sec.dto.RoleDto;
import java.util.List;

public interface AuthorManageService {
    List<AuthorDto> selectAuthorList();

    AuthorDto selectAuthor(String authorCode);

    void insertAuthor(AuthorDto authorDto);

    void updateAuthor(AuthorDto authorDto);

    void deleteAuthor(String authorCode);

    List<RoleDto> selectRoleList();

    RoleDto selectRole(String roleCode);

    void insertRole(RoleDto roleDto);

    void updateRole(RoleDto roleDto);

    void deleteRole(String roleCode);

    void insertAuthorRoleRelate(String authorCode, List<String> roleCodes);

    List<RoleDto> selectAuthorRoleList(String authorCode);
}
