package com.company.project.foundation.domain.user.mapper;

import com.company.project.foundation.core.mapper.GenericMapper;
import com.company.project.foundation.domain.user.dto.UserAbsenceDto;
import com.company.project.foundation.domain.user.entity.UserAbsence;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserAbsenceMapper extends GenericMapper<UserAbsenceDto, UserAbsence> {
    UserAbsenceMapper INSTANCE = Mappers.getMapper(UserAbsenceMapper.class);
}
