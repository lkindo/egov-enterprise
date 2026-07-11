package nuri.business.service.deptjob.dto;

import nuri.business.domain.deptjob.DeptJob;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * 부서업무 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code DeptJobDto.from()} 를 대체하는 프레임워크 표준 매핑.
 * from() 과 동일 거동 보장:
 * <ul>
 *   <li>{@code deptTaskBoxNm} 은 연관 엔티티 {@code deptJobBox.deptTaskBoxNm} 에서 null-safe 로 채운다
 *       (MapStruct 가 중첩 소스 접근에 대해 null 체크 코드를 생성 → 원본 삼항식과 동일).</li>
 *   <li>{@code deptId}/{@code deptNm}/{@code picNm} 은 from() 이 채우지 않던 필드로, 매핑에서 제외(null 유지)한다.
 *       서비스 레이어(toDto)에서 리포지토리 조회로 후속 enrich 한다.</li>
 * </ul>
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface DeptJobMapper {

    @Mapping(target = "deptTaskBoxNm", source = "deptJobBox.deptTaskBoxNm")
    @Mapping(target = "deptId", ignore = true)
    @Mapping(target = "deptNm", ignore = true)
    @Mapping(target = "picNm", ignore = true)
    DeptJobDto toDto(DeptJob entity);
}
