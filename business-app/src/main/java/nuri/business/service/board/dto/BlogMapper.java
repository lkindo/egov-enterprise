package nuri.business.service.board.dto;

import nuri.business.domain.board.Blog;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * 블로그 엔티티→DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code BlogDto.from(Blog)} 를 대체한다. from() 은 전 필드 직접 복사(리네임/미설정 없음)였으므로
 * 매핑 애너테이션 없이 이름 일치 매핑으로 동일 동작을 재현한다. (FaqMapper 표준 패턴)
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlogMapper {

    BlogDto toDto(Blog entity);
}
