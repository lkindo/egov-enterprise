package com.company.project.service.user.mapper;

import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-02-20T15:40:34+0900",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.45.0.v20260128-0750, environment: Java 21.0.9 (Eclipse Adoptium)"
)
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public UserDto toDto(User user) {
        if ( user == null ) {
            return null;
        }

        UserDto.UserDtoBuilder userDto = UserDto.builder();

        userDto.createdDate( user.getCreatedDate() );
        userDto.emplNo( user.getEmplNo() );
        userDto.esntlId( user.getEsntlId() );
        userDto.ofcpsNm( user.getOfcpsNm() );
        userDto.userId( user.getUserId() );
        userDto.userNm( user.getUserNm() );

        userDto.role( user.getRole() != null ? user.getRole().name() : null );

        return userDto.build();
    }

    @Override
    public UserDto toDtoWithAuthority(User user, UserAuthority authority) {
        if ( user == null && authority == null ) {
            return null;
        }

        UserDto.UserDtoBuilder userDto = UserDto.builder();

        if ( user != null ) {
            userDto.userId( user.getUserId() );
            userDto.userNm( user.getUserNm() );
            userDto.esntlId( user.getEsntlId() );
            userDto.createdDate( user.getCreatedDate() );
            userDto.emplNo( user.getEmplNo() );
            userDto.ofcpsNm( user.getOfcpsNm() );
        }
        if ( authority != null ) {
            userDto.role( authority.getAuthorCode() );
        }

        return userDto.build();
    }

    @Override
    public UserResponse toResponse(User user) {
        if ( user == null ) {
            return null;
        }

        String userId = null;
        String userNm = null;
        Role role = null;

        userId = user.getUserId();
        userNm = user.getUserNm();
        role = user.getRole();

        UserResponse userResponse = new UserResponse( userId, userNm, role );

        return userResponse;
    }
}
