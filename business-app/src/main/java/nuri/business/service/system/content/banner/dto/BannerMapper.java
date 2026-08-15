package nuri.business.service.system.content.banner.dto;

import nuri.business.domain.system.content.banner.Banner;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 배너 엔티티→DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code BannerDto.from()} 를 대체하는 프레임워크 표준 매핑 패턴.
 * 모든 필드가 동일 명칭·타입의 단순 복사이므로 추가 @Mapping 없이 1:1 매핑된다.
 * ({@code frstRgtrId}/{@code crtDt} 는 {@code BaseEntity}/{@code BaseTimeEntity} 상속 필드.)
 * componentModel="spring" 으로 {@code BannerMapperImpl} 이 @Component 로 생성되어 주입 가능하다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BannerMapper {

    BannerDto toDto(Banner entity);
}
