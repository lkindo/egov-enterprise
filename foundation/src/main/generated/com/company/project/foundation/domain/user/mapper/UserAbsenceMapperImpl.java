package com.company.project.foundation.domain.user.mapper;

import com.company.project.foundation.domain.user.dto.UserAbsenceDto;
import com.company.project.foundation.domain.user.entity.UserAbsence;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-03-30T01:13:36+0900",
    comments = "version: 1.5.5.Final, compiler: IncrementalProcessingEnvironment from gradle-language-java-9.4.1.jar, environment: Java 21.0.9 (Eclipse Adoptium)"
)
@Component
public class UserAbsenceMapperImpl implements UserAbsenceMapper {

    @Override
    public UserAbsenceDto toDto(UserAbsence entity) {
        if ( entity == null ) {
            return null;
        }

        UserAbsenceDto.UserAbsenceDtoBuilder userAbsenceDto = UserAbsenceDto.builder();

        userAbsenceDto.emplyrId( entity.getEmplyrId() );
        userAbsenceDto.userAbsnceAt( entity.getUserAbsnceAt() );

        return userAbsenceDto.build();
    }

    @Override
    public UserAbsence toEntity(UserAbsenceDto dto) {
        if ( dto == null ) {
            return null;
        }

        UserAbsence.UserAbsenceBuilder userAbsence = UserAbsence.builder();

        userAbsence.emplyrId( dto.getEmplyrId() );
        userAbsence.userAbsnceAt( dto.getUserAbsnceAt() );

        return userAbsence.build();
    }

    @Override
    public List<UserAbsenceDto> toDtoList(List<UserAbsence> entityList) {
        if ( entityList == null ) {
            return null;
        }

        List<UserAbsenceDto> list = new ArrayList<UserAbsenceDto>( entityList.size() );
        for ( UserAbsence userAbsence : entityList ) {
            list.add( toDto( userAbsence ) );
        }

        return list;
    }

    @Override
    public List<UserAbsence> toEntityList(List<UserAbsenceDto> dtoList) {
        if ( dtoList == null ) {
            return null;
        }

        List<UserAbsence> list = new ArrayList<UserAbsence>( dtoList.size() );
        for ( UserAbsenceDto userAbsenceDto : dtoList ) {
            list.add( toEntity( userAbsenceDto ) );
        }

        return list;
    }
}
