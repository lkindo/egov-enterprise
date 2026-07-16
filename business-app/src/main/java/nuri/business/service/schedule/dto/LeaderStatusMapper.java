package nuri.business.service.schedule.dto;

import nuri.business.domain.schedule.LeaderStatus;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * 간부상태 엔티티→DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code LeaderStatusDto.from()} 를 대체하는 프레임워크 표준 매핑.
 * from() 은 {@code leaderId / leaderSttsCd / crtDt} 만 복사하고 표시용 필드
 * ({@code leaderNm / orgnztNm / leaderSttusNm})는 엔티티에 원본이 없어 null 로 남기므로
 * 동일 거동을 위해 명시적으로 무시한다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface LeaderStatusMapper {

    // LeaderStatus 엔티티에 없는 표시용 필드 (from() 도 미설정)
    @Mapping(target = "leaderNm", ignore = true)
    @Mapping(target = "orgnztNm", ignore = true)
    @Mapping(target = "leaderSttusNm", ignore = true)
    LeaderStatusDto toDto(LeaderStatus entity);
}
