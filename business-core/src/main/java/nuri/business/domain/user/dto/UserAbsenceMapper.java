package nuri.business.domain.user.dto;

import nuri.business.domain.user.entity.UserAbsence;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 사용자 부재(UserAbsence) 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code UserAbsenceDto.from()} 를 대체하는 프레임워크 표준 매핑 패턴({@code FaqMapper} 참조).
 * componentModel="spring" 으로 {@code UserAbsenceMapperImpl} 이 @Component 로 생성되어 주입 가능하다.
 * userId·userAbsnYn 단순 필드 복사이므로 매핑 코드가 자동 생성된다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserAbsenceMapper {

    UserAbsenceDto toDto(UserAbsence entity);

    UserAbsence toEntity(UserAbsenceDto dto);
}
