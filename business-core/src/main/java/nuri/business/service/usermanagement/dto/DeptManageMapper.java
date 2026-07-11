package nuri.business.service.usermanagement.dto;

import nuri.business.domain.user.entity.DeptManage;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 부서 정보 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code DeptManageDto.from()} 를 대체하는 프레임워크 표준 매핑.
 * 모든 필드({@code ognzId}, {@code ognzNm}, {@code ognzExpln}, {@code frstRgtrId}, {@code crtDt})가
 * 동일 명칭으로 1:1 단순 복사되어 from() 과 거동이 동일하다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface DeptManageMapper {

    DeptManageDto toDto(DeptManage entity);
}
