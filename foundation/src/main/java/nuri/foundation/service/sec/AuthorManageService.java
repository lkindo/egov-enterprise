package nuri.foundation.service.sec;

import nuri.foundation.service.sec.dto.AuthorDto;
import nuri.foundation.service.sec.dto.RoleDto;
import org.springframework.lang.NonNull;
import java.util.List;

public interface AuthorManageService {
    List<AuthorDto> selectAuthorList();

    AuthorDto selectAuthor(@NonNull String authrtCd);

    void insertAuthor(@NonNull AuthorDto dto);

    void updateAuthor(@NonNull AuthorDto dto);

    void deleteAuthor(@NonNull String authrtCd);

    List<RoleDto> selectRoleList();

    RoleDto selectRole(@NonNull String roleId);

    void insertRole(@NonNull RoleDto dto);

    void updateRole(@NonNull RoleDto dto);

    void deleteRole(@NonNull String roleId);

    void insertAuthorRoleRelate(@NonNull String authrtCd, @NonNull List<String> roleCodes);

    List<RoleDto> selectAuthorRoleList(@NonNull String authrtCd);
}
