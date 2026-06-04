package nuri.business.service.user.mapper;

import nuri.business.domain.user.entity.User;
import nuri.business.domain.auth.UserAuthority;
import nuri.business.service.user.dto.UserDto;
import nuri.business.service.user.dto.UserResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface UserMapper {

    UserMapper INSTANCE = Mappers.getMapper(UserMapper.class);

    @Mapping(target = "role", expression = "java(user.getRole() != null ? user.getRole().name() : null)")
    @Mapping(target = "userSe", ignore = true)
    @Mapping(target = "mbrTypeCd", ignore = true)
    UserDto toDto(User user);

    @Mapping(target = "userId", source = "user.userId")
    @Mapping(target = "userNm", source = "user.userNm")
    @Mapping(target = "esntlId", source = "user.esntlId")
    @Mapping(target = "role", expression = "java(authority != null ? authority.getAuthrtId() : (user != null && user.getRole() != null ? \"ROLE_\" + user.getRole().name() : \"ROLE_USER\"))")
    @Mapping(target = "userSe", expression = "java(authority != null ? authority.getMbrTypeCd() : \"USR\")")
    @Mapping(target = "userSttsCd", source = "user.userSttsCd")
    @Mapping(target = "crtDt", source = "user.crtDt")
    UserDto toDtoWithAuthority(User user, UserAuthority authority);

    UserResponse toResponse(User user);
}
