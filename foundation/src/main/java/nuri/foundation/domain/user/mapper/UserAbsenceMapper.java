package nuri.foundation.domain.user.mapper;

import nuri.foundation.core.mapper.GenericMapper;
import nuri.foundation.domain.user.dto.UserAbsenceDto;
import nuri.foundation.domain.user.entity.UserAbsence;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserAbsenceMapper extends GenericMapper<UserAbsenceDto, UserAbsence> {
    UserAbsenceMapper INSTANCE = Mappers.getMapper(UserAbsenceMapper.class);

    @Override
    @org.mapstruct.Mapping(source = "userAbsnYn", target = "userAbsnceAt")
    UserAbsenceDto toDto(UserAbsence entity);

    @Override
    @org.mapstruct.Mapping(source = "userAbsnceAt", target = "userAbsnYn")
    UserAbsence toEntity(UserAbsenceDto dto);
}
