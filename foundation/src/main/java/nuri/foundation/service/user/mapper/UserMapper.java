package nuri.foundation.service.user.mapper;

import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.auth.UserAuthority;
import nuri.foundation.service.user.dto.UserDto;
import nuri.foundation.service.user.dto.UserResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface UserMapper {

    UserMapper INSTANCE = Mappers.getMapper(UserMapper.class);

    @Mapping(target = "createdDate", source = "createdDate")
    @Mapping(target = "role", expression = "java(user.getRole() != null ? user.getRole().name() : null)")
    @Mapping(target = "userSe", ignore = true)
    @Mapping(target = "mberTyCode", ignore = true)
    @Mapping(target = "userSttusCode", source = "empStatus")
    UserDto toDto(User user);

    @Mapping(target = "userId", source = "user.userId")
    @Mapping(target = "userNm", source = "user.userNm")
    @Mapping(target = "esntlId", source = "user.esntlId")
    @Mapping(target = "role", expression = "java(authority != null ? authority.getAuthorCode() : (user != null && user.getRole() != null ? \"ROLE_\" + user.getRole().name() : \"ROLE_USER\"))")
    @Mapping(target = "userSe", expression = "java(authority != null ? authority.getMberTyCode() : \"USR\")")
    @Mapping(target = "userSttusCode", source = "user.empStatus")
    @Mapping(target = "createdDate", source = "user.createdDate")
    UserDto toDtoWithAuthority(User user, UserAuthority authority);

    UserResponse toResponse(User user);
}
