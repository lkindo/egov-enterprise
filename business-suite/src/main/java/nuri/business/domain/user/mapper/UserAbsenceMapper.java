package nuri.business.domain.user.mapper;

import nuri.foundation.core.mapper.GenericMapper;
import nuri.business.domain.user.dto.UserAbsenceDto;
import nuri.business.domain.user.entity.UserAbsence;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserAbsenceMapper extends GenericMapper<UserAbsenceDto, UserAbsence> {
    UserAbsenceMapper INSTANCE = Mappers.getMapper(UserAbsenceMapper.class);


}
