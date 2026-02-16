package com.company.project.service.user.mapper;

import com.company.project.domain.user.User;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface UserMapper {

    UserMapper INSTANCE = Mappers.getMapper(UserMapper.class);

    @Mapping(target = "createdDate", source = "createdDate")
    @Mapping(target = "role", expression = "java(user.getRole() != null ? user.getRole().name() : null)")
    UserDto toDto(User user);

    UserResponse toResponse(User user);
}
