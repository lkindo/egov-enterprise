package nuri.business.service.calendar.dto;

import nuri.business.domain.calendar.Restde;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 휴일 정보 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code RestdeDto.from()} 를 대체하는 프레임워크 표준 매핑 패턴({@link nuri.business.service.faq.dto.FaqMapper} 참조).
 * 전 필드가 동일 명칭의 단순 복사이므로 별도 {@code @Mapping} 없이 자동 매핑된다.
 * componentModel="spring" 으로 {@code RestdeMapperImpl} 이 @Component 로 생성되어 주입 가능하다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RestdeMapper {

    RestdeDto toDto(Restde entity);

    Restde toEntity(RestdeDto dto);
}
