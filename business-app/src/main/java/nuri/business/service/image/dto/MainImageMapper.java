package nuri.business.service.image.dto;

import nuri.business.domain.image.MainImage;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 메인 이미지 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code MainImageDto.from()} 를 대체하는 프레임워크 표준 매핑 패턴({@link nuri.business.service.faq.dto.FaqMapper} 참조).
 * 전 필드가 동일 명칭의 단순 복사(BaseEntity 상속 {@code frstRgtrId}, {@code crtDt} 포함)이므로 자동 매핑된다.
 * componentModel="spring" 으로 {@code MainImageMapperImpl} 이 @Component 로 생성되어 주입 가능하다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface MainImageMapper {

    MainImageDto toDto(MainImage entity);

    MainImage toEntity(MainImageDto dto);
}
