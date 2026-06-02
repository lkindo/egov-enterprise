package nuri.business.service.board;

import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardDetailResult;
import nuri.business.domain.board.BoardSearchResult;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardSaveRequest;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface BoardMapper {

    @Mapping(target = "pstId", source = "pstId")
    @Mapping(target = "crtDt", source = "crtDt")
    @Mapping(target = "upPstId", source = "upPstId")
    BoardDto toDto(Board entity);

    @Mapping(target = "pstId", source = "pstId")
    @Mapping(target = "userNm", source = "frstRegisterNm")
    @Mapping(target = "crtDt", source = "crtDt")
    @Mapping(target = "upPstId", source = "upPstId")
    BoardDto toDto(BoardSearchResult result);

    @Mapping(target = "pstId", source = "pstId")
    @Mapping(target = "userNm", source = "frstRegisterNm")
    @Mapping(target = "crtDt", source = "crtDt")
    @Mapping(target = "upPstId", source = "upPstId")
    BoardDto toDto(BoardDetailResult detail);

    @Mapping(target = "pstId", ignore = true)
    @Mapping(target = "ansSn", constant = "1L")
    @Mapping(target = "upPstId", constant = "0")
    @Mapping(target = "useYn", source = "request.useYn", defaultValue = "Y")
    @Mapping(target = "qnaSttsCd", source = "request.qnaSttsCd", defaultValue = "OPEN")
    @Mapping(target = "evntDt", source = "request.evntDt", qualifiedByName = "parseDateTime")
    @Mapping(target = "inqCnt", constant = "0")
    @Mapping(target = "likeCnt", constant = "0")
    @Mapping(target = "bbsId", source = "bbsId")
    @Mapping(target = "userId", source = "userId")
    @Mapping(target = "userNm", source = "userNm")
    @Mapping(target = "sortOrdr", source = "sortOrdr")
    Board toEntity(BoardSaveRequest request, String bbsId, String userId, String userNm, Long sortOrdr);

    @Mapping(target = "pstId", ignore = true)
    @Mapping(target = "ansSn", source = "ansSn")
    @Mapping(target = "upPstId", source = "upPstId")
    @Mapping(target = "ansLvl", source = "replyLc")
    @Mapping(target = "useYn", source = "request.useYn", defaultValue = "Y")
    @Mapping(target = "qnaSttsCd", source = "request.qnaSttsCd", defaultValue = "OPEN")
    @Mapping(target = "evntDt", source = "request.evntDt", qualifiedByName = "parseDateTime")
    @Mapping(target = "inqCnt", constant = "0")
    @Mapping(target = "likeCnt", constant = "0")
    @Mapping(target = "bbsId", source = "bbsId")
    @Mapping(target = "userId", source = "userId")
    @Mapping(target = "userNm", source = "userNm")
    @Mapping(target = "sortOrdr", source = "sortOrdr")
    Board toReplyEntity(BoardSaveRequest request, String bbsId, String userId, String userNm, Long sortOrdr, Long ansSn, String upPstId, Integer replyLc);

    @Named("formatDate")
    default String formatDate(LocalDateTime date) {
        return date != null ? date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) : "";
    }

    @Named("formatDateTime")
    default String formatDateTime(LocalDateTime dateTime) {
        return dateTime != null ? dateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")) : "";
    }

    @Named("blogIdToYn")
    default String blogIdToYn(String blogId) {
        return blogId != null ? "Y" : "N";
    }

    @Named("calculateExpired")
    default String calculateExpired(String ntceEndYmd) {
        if (ntceEndYmd == null || ntceEndYmd.isEmpty()) return "N";
        String today = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        return ntceEndYmd.compareTo(today) < 0 ? "Y" : "N";
    }

    @Named("parseDateTime")
    default LocalDateTime parseDateTime(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return null;
        try {
            // ISO-8601 or common formats
            if (dateStr.length() == 10) {
                return java.time.LocalDate.parse(dateStr).atStartOfDay();
            }
            return LocalDateTime.parse(dateStr);
        } catch (Exception e) {
            return null;
        }
    }
}
