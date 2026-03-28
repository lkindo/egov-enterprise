package com.company.project.foundation.service.user.mapper;

import com.company.project.foundation.domain.user.entity.User;
import com.company.project.foundation.domain.auth.UserAuthority;
import com.company.project.foundation.service.user.dto.UserDto;
import com.company.project.foundation.service.user.dto.UserResponse;
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
    UserDto toDto(User user);

    @Mapping(target = "userId", source = "user.userId")
    @Mapping(target = "userNm", source = "user.userNm")
    @Mapping(target = "esntlId", source = "user.esntlId")
    @Mapping(target = "role", source = "authority.authorCode")
    @Mapping(target = "userSe", source = "authority.mberTyCode")
    @Mapping(target = "createdDate", source = "user.createdDate")
    UserDto toDtoWithAuthority(User user, UserAuthority authority);

    UserResponse toResponse(User user);
}
