package nuri.business.service.system.service.consult.dto;

import nuri.business.domain.system.service.consult.CnsltManage;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 상담 관리 엔티티→DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code CnsltManageDto.from()} 를 대체하는 프레임워크 표준 매핑 패턴 구현.
 * 모든 필드가 동일 이름·동일 타입으로 1:1 복사되므로(엔티티 own 필드 + BaseEntity#frstRgtrId +
 * BaseTimeEntity#crtDt) 별도 {@code @Mapping} 없이 자동 매핑된다. 기존 {@code from()} 과 동작 동일
 * (source null → null 반환 포함). componentModel="spring" 으로 {@code CnsltManageMapperImpl} 이
 * @Component 로 생성되어 주입 가능하다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CnsltManageMapper {

    CnsltManageDto toDto(CnsltManage entity);
}
