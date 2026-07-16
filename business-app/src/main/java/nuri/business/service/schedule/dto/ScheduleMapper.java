package nuri.business.service.schedule.dto;

import nuri.business.domain.schedule.Schedule;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 일정 엔티티→DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code ScheduleDto.from()} 를 대체하는 프레임워크 표준 매핑.
 * 모든 DTO 필드가 엔티티(상속 감사필드 {@code frstRgtrId/lastMdfrId/crtDt/mdfcnDt} 포함)의
 * 동일 명칭 필드와 1:1 매핑된다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ScheduleMapper {

    ScheduleDto toDto(Schedule entity);
}
