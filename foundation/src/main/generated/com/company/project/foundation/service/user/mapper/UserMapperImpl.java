package com.company.project.foundation.service.user.mapper;

import com.company.project.foundation.domain.auth.UserAuthority;
import com.company.project.foundation.domain.user.entity.Role;
import com.company.project.foundation.domain.user.entity.User;
import com.company.project.foundation.service.user.dto.UserDto;
import com.company.project.foundation.service.user.dto.UserResponse;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-03-28T23:49:01+0900",
    comments = "version: 1.5.5.Final, compiler: IncrementalProcessingEnvironment from gradle-language-java-9.4.1.jar, environment: Java 21.0.9 (Eclipse Adoptium)"
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
        userDto.userId( user.getUserId() );
        userDto.userNm( user.getUserNm() );
        userDto.esntlId( user.getEsntlId() );
        userDto.password( user.getPassword() );
        userDto.passwordHint( user.getPasswordHint() );
        userDto.passwordCnsr( user.getPasswordCnsr() );
        userDto.emplNo( user.getEmplNo() );
        userDto.sexdstnCode( user.getSexdstnCode() );
        userDto.brth( user.getBrth() );
        userDto.areaNo( user.getAreaNo() );
        userDto.homemiddleTelno( user.getHomemiddleTelno() );
        userDto.homeendTelno( user.getHomeendTelno() );
        userDto.fxnum( user.getFxnum() );
        userDto.insttCode( user.getInsttCode() );
        userDto.orgnztId( user.getOrgnztId() );
        userDto.groupId( user.getGroupId() );
        userDto.homeadres( user.getHomeadres() );
        userDto.detailAdres( user.getDetailAdres() );
        userDto.zip( user.getZip() );
        userDto.offmTelno( user.getOffmTelno() );
        userDto.moblphonNo( user.getMoblphonNo() );
        userDto.emailAdres( user.getEmailAdres() );
        userDto.ofcpsNm( user.getOfcpsNm() );
        userDto.subDn( user.getSubDn() );

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
            userDto.password( user.getPassword() );
            userDto.passwordHint( user.getPasswordHint() );
            userDto.passwordCnsr( user.getPasswordCnsr() );
            userDto.emplNo( user.getEmplNo() );
            userDto.sexdstnCode( user.getSexdstnCode() );
            userDto.brth( user.getBrth() );
            userDto.areaNo( user.getAreaNo() );
            userDto.homemiddleTelno( user.getHomemiddleTelno() );
            userDto.homeendTelno( user.getHomeendTelno() );
            userDto.fxnum( user.getFxnum() );
            userDto.insttCode( user.getInsttCode() );
            userDto.orgnztId( user.getOrgnztId() );
            userDto.groupId( user.getGroupId() );
            userDto.homeadres( user.getHomeadres() );
            userDto.detailAdres( user.getDetailAdres() );
            userDto.zip( user.getZip() );
            userDto.offmTelno( user.getOffmTelno() );
            userDto.moblphonNo( user.getMoblphonNo() );
            userDto.emailAdres( user.getEmailAdres() );
            userDto.ofcpsNm( user.getOfcpsNm() );
            userDto.subDn( user.getSubDn() );
        }
        if ( authority != null ) {
            userDto.role( authority.getAuthorCode() );
            userDto.userSe( authority.getMberTyCode() );
            userDto.mberTyCode( authority.getMberTyCode() );
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
