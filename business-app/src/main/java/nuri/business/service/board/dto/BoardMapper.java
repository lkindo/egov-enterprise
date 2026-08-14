package nuri.business.service.board.dto;

import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardDetailResult;
import nuri.business.domain.board.BoardSearchResult;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * 게시글 엔티티/조회결과→DTO MapStruct 매퍼 (컴파일타임 생성, Spring 빈).
 *
 * <p>수기 {@code BoardDto.from(...)} 3종 오버로드를 대체한다. 각 소스 타입별로 from() 본문을
 * 정확히 반영한다. (FaqMapper 표준 패턴)
 * <ul>
 *   <li>{@link Board} → commentCnt 는 엔티티 cmntCnt 에서 매핑, frstRegisterNm 은 미설정(ignore).</li>
 *   <li>{@link BoardSearchResult} → userId 는 frstRgtrId 에서 매핑, 그 외 조회결과에 없는 필드
 *       (pstCn/sortOrdr/pswd/blogSn/fileCnt/frstRegisterNm)는 미설정(ignore).</li>
 *   <li>{@link BoardDetailResult} → 조회결과에 없는 필드(blogSn/fileCnt/frstRegisterNm)는 미설정(ignore).</li>
 * </ul>
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BoardMapper {

    @Mapping(target = "commentCnt", source = "cmntCnt")
    @Mapping(target = "frstRegisterNm", ignore = true)
    BoardDto toDto(Board entity);

    @Mapping(target = "userId", source = "frstRgtrId")
    @Mapping(target = "pstCn", ignore = true)
    @Mapping(target = "sortOrdr", ignore = true)
    @Mapping(target = "pswd", ignore = true)
    @Mapping(target = "blogSn", ignore = true)
    @Mapping(target = "fileCnt", ignore = true)
    @Mapping(target = "frstRegisterNm", ignore = true)
    BoardDto toDto(BoardSearchResult result);

    @Mapping(target = "blogSn", ignore = true)
    @Mapping(target = "fileCnt", ignore = true)
    @Mapping(target = "frstRegisterNm", ignore = true)
    BoardDto toDto(BoardDetailResult detail);
}
