package nuri.business.service.faq.dto;

import nuri.business.domain.faq.Faq;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * FAQ 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code FaqDto.from()} 를 대체하는 프레임워크 표준 매핑 패턴의 참조 구현.
 * componentModel="spring" 으로 {@code FaqMapperImpl} 이 @Component 로 생성되어 주입 가능하다.
 * 신규 도메인은 이 패턴을 따라 매퍼 인터페이스만 선언하면 매핑 코드가 자동 생성된다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface FaqMapper {

    FaqDto toDto(Faq entity);

    Faq toEntity(FaqDto dto);
}
