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

    @Mapping(target = "createdDate", source = "createdDate")
    @Mapping(target = "role", expression = "java(user.getRole() != null ? user.getRole().name() : null)")
    @Mapping(target = "userSe", ignore = true)
    @Mapping(target = "mberTypeCd", ignore = true)
    @Mapping(target = "userSttsCd", source = "userSttsCd")
    @Mapping(target = "homeMiddleTelno", source = "middleTelno")
    @Mapping(target = "homeEndTelno", source = "endTelno")
    @Mapping(target = "insttCd", source = "pstinstCd")
    UserDto toDto(User user);

    @Mapping(target = "userId", source = "user.userId")
    @Mapping(target = "userNm", source = "user.userNm")
    @Mapping(target = "esntlId", source = "user.esntlId")
    @Mapping(target = "role", expression = "java(authority != null ? authority.getAuthrtId() : (user != null && user.getRole() != null ? \"ROLE_\" + user.getRole().name() : \"ROLE_USER\"))")
    @Mapping(target = "userSe", expression = "java(authority != null ? authority.getMbrTypeCd() : \"USR\")")
    @Mapping(target = "mberTypeCd", source = "authority.mbrTypeCd")
    @Mapping(target = "userSttsCd", source = "user.userSttsCd")
    @Mapping(target = "createdDate", source = "user.createdDate")
    @Mapping(target = "homeMiddleTelno", source = "user.middleTelno")
    @Mapping(target = "homeEndTelno", source = "user.endTelno")
    @Mapping(target = "insttCd", source = "user.pstinstCd")
    UserDto toDtoWithAuthority(User user, UserAuthority authority);

    UserResponse toResponse(User user);
}
