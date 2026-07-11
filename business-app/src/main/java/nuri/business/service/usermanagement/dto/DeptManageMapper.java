package nuri.business.service.usermanagement.dto;

import nuri.business.domain.user.entity.DeptManage;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 부서 정보 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code DeptManageDto.from()} 를 대체하는 프레임워크 표준 매핑 패턴({@link nuri.business.service.faq.dto.FaqMapper} 참조).
 * 모든 필드가 동일 명칭으로 1:1 대응하므로 별도 {@code @Mapping} 없이 자동 매핑된다.
 * componentModel="spring" 으로 {@code DeptManageMapperImpl} 이 @Component 로 생성되어 주입 가능하다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface DeptManageMapper {

    DeptManageDto toDto(DeptManage entity);

    DeptManage toEntity(DeptManageDto dto);
}
