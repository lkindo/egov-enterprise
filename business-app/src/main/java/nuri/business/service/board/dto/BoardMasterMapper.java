package nuri.business.service.board.dto;

import nuri.business.domain.board.BoardMaster;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * 게시판 마스터 엔티티→DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code BoardMasterDto.from(BoardMaster)} 를 대체한다. from() 은 전 필드 이름 일치 복사이며
 * 조인 표시용 필드(bbsTypeCdNm/bbsAtrbCdNm)와 부가 필드(authFlag/tmplatCours)는 엔티티에 대응 소스가
 * 없어 미설정으로 남겼다. from() 과 동일하게 해당 타겟은 ignore 처리한다. (FaqMapper 표준 패턴)
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BoardMasterMapper {

    @Mapping(target = "bbsTypeCdNm", ignore = true)
    @Mapping(target = "bbsAtrbCdNm", ignore = true)
    @Mapping(target = "authFlag", ignore = true)
    @Mapping(target = "tmplatCours", ignore = true)
    BoardMasterDto toDto(BoardMaster entity);
}
