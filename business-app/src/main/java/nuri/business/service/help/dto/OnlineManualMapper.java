package nuri.business.service.help.dto;

import nuri.business.domain.help.OnlineManual;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 온라인 메뉴얼 엔티티↔DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code OnlineManualDto.from()} 를 대체하는 프레임워크 표준 매핑 패턴({@code FaqMapper} 참조 구현 준수).
 * componentModel="spring" 으로 {@code OnlineManualMapperImpl} 이 @Component 로 생성되어 주입 가능하다.
 * 모든 필드가 동일 명명 직결 복사(own 필드 + 상속 frstRgtrId·crtDt)이므로 별도 @Mapping 선언이 불필요하다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface OnlineManualMapper {

    OnlineManualDto toDto(OnlineManual entity);

    OnlineManual toEntity(OnlineManualDto dto);
}
