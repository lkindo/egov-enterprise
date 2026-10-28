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
 *   <li>{@link Board} → commentCnt 는 엔티티 cmntCnt 에서 매핑.</li>
 *   <li>{@link BoardSearchResult} → userId 는 frstRgtrId 에서 매핑, 그 외 조회결과에 없는 필드
 *       (pstCn/sortOrdr/pswd/fileCnt)는 미설정(ignore).</li>
 *   <li>{@link BoardDetailResult} → 조회결과에 없는 필드(fileCnt)는 미설정(ignore).</li>
 * </ul>
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BoardMapper {

    // [ADR-0040 결정 5] 고정 여부(pinned)와 고정 종료일(upendFixEndYmd)은 서버 기준일로 판정한 값이라 매퍼가 옮기지 않는다 —
    //   BoardService 가 게시판 목록·상세에서만 채운다. 그대로 옮기면 종료일이 지난 옛 고정의 날짜가 다른 경로(통합 검색 등)로 나간다.
    // [2026-10-26 ADR-0043, NAV-10] 게시판 이름(bbsTtl)은 통합 검색만 싣는다 — BoardService#searchAcrossBoards 가 채운다. 매퍼가
    //   옮기면 게시판 목록·상세 응답의 모든 글에 같은 이름이 실린다.
    // [2026-10-29] 엔티티의 비밀글 여부가 비어 있으면(NULL) 'N' 으로 싣는다 — 조회 결과(BoardSearchResult·BoardDetailResult)의 getter 와
    //   같은 규칙이다. 열람 판정은 모두 NULL 을 공개 글로 본다.
    @Mapping(target = "commentCnt", source = "cmntCnt")
    @Mapping(target = "scrtYn", source = "scrtYn", defaultValue = "N")
    @Mapping(target = "pinned", ignore = true)
    @Mapping(target = "upendFixEndYmd", ignore = true)
    @Mapping(target = "bbsTtl", ignore = true)
    BoardDto toDto(Board entity);

    @Mapping(target = "userId", source = "frstRgtrId")
    @Mapping(target = "pstCn", ignore = true)
    @Mapping(target = "sortOrdr", ignore = true)
    @Mapping(target = "pswd", ignore = true)
    @Mapping(target = "fileCnt", ignore = true)
    @Mapping(target = "pinned", ignore = true)
    @Mapping(target = "upendFixEndYmd", ignore = true)
    @Mapping(target = "bbsTtl", ignore = true)
    BoardDto toDto(BoardSearchResult result);

    @Mapping(target = "fileCnt", ignore = true)
    @Mapping(target = "pinned", ignore = true)
    @Mapping(target = "upendFixEndYmd", ignore = true)
    @Mapping(target = "bbsTtl", ignore = true)
    BoardDto toDto(BoardDetailResult detail);
}
