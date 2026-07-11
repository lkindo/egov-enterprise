package nuri.business.service.notification.dto;

import nuri.business.domain.notification.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * 알림 엔티티→DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code NotificationDto.from()} 를 대체하는 프레임워크 표준 매핑.
 * componentModel="spring" 으로 {@code NotificationMapperImpl} 이 @Component 로 생성되어 주입 가능하다.
 *
 * <p>기존 {@code from()} 은 {@code notiIvlVal} 을 복사하지 않았으므로(널 유지),
 * 동작 동일성을 위해 해당 타깃을 명시적으로 무시한다.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface NotificationMapper {

    @Mapping(target = "notiIvlVal", ignore = true)
    NotificationDto toDto(Notification entity);
}
