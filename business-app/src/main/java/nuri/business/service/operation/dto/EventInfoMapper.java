package nuri.business.service.operation.dto;

import nuri.business.domain.operation.EventInfo;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 행사 정보 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code EventInfoDto.from()} 를 대체하는 프레임워크 표준 매핑({@link nuri.business.service.faq.dto.FaqMapper} 참조 패턴).
 * from() 은 모든 필드를 동일 명칭으로 직접 복사하므로 추가 @Mapping 규칙 없이 자동 매핑된다.
 * componentModel="spring" 으로 {@code EventInfoMapperImpl} 이 @Component 로 생성되어 주입 가능하다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface EventInfoMapper {

    EventInfoDto toDto(EventInfo entity);

    EventInfo toEntity(EventInfoDto dto);
}
