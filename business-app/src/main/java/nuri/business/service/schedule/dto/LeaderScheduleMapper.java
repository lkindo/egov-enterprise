package nuri.business.service.schedule.dto;

import nuri.business.domain.schedule.LeaderSchedule;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * 간부일정 엔티티→DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code LeaderScheduleDto.from()} 를 대체하는 프레임워크 표준 매핑.
 * 동일 명칭 필드 1:1 복사이며, 엔티티에 원본이 없는 {@code leaderNm}(enrichment)은
 * from() 과 동일하게 미설정(null)으로 남긴다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface LeaderScheduleMapper {

    // leaderNm 은 LeaderSchedule 엔티티에 존재하지 않는 표시용 필드 (from() 도 미설정)
    @Mapping(target = "leaderNm", ignore = true)
    LeaderScheduleDto toDto(LeaderSchedule entity);
}
