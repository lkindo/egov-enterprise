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
    @Mapping(target = "knoId", source = "pstId", qualifiedByName = "longToString")
    @Mapping(target = "knoNm", source = "pstTtl")
    @Mapping(target = "knoCn", source = "pstCn")
    @Mapping(target = "statusCd", source = "qnaStatus")
    @Mapping(target = "categoryCd", source = "qnaCategory")
    @Mapping(target = "frstRegisterPnttm", source = "createdDate")
    @Mapping(target = "frstRegisterPnttmStr", source = "createdDate", qualifiedByName = "formatDate")
    @Mapping(target = "frstRegisterId", source = "createdBy")
    @Mapping(target = "lastUpdtPnttm", source = "lastModifiedDate")
    @Mapping(target = "blogYn", source = "blogId", qualifiedByName = "blogIdToYn")
    @Mapping(target = "eventDateStr", source = "eventDate", qualifiedByName = "formatDateTime")
    @Mapping(target = "isExpired", source = "ntceEndYmd", qualifiedByName = "calculateExpired")
    @Mapping(target = "parnts", source = "parnts", qualifiedByName = "longToString")
    @Mapping(target = "bbsTtl", ignore = true)
    BoardDto toDto(Board entity);

    @Mapping(target = "pstId", source = "pstId")
    @Mapping(target = "knoId", source = "pstId", qualifiedByName = "longToString")
    @Mapping(target = "knoNm", source = "pstTtl")
    @Mapping(target = "statusCd", source = "qnaStatus")
    @Mapping(target = "categoryCd", source = "qnaCategory")
    @Mapping(target = "ntcrNm", source = "frstRegisterNm")
    @Mapping(target = "frstRegisterPnttm", source = "createdDate")
    @Mapping(target = "frstRegisterPnttmStr", source = "createdDate", qualifiedByName = "formatDate")
    @Mapping(target = "eventDateStr", source = "eventDate", qualifiedByName = "formatDateTime")
    @Mapping(target = "isExpired", source = "ntceEndYmd", qualifiedByName = "calculateExpired")
    @Mapping(target = "parnts", source = "parnts", qualifiedByName = "longToString")
    @Mapping(target = "bbsTtl", ignore = true)
    BoardDto toDto(BoardSearchResult result);

    @Mapping(target = "pstId", source = "pstId")
    @Mapping(target = "knoId", source = "pstId", qualifiedByName = "longToString")
    @Mapping(target = "knoNm", source = "pstTtl")
    @Mapping(target = "knoCn", source = "pstCn")
    @Mapping(target = "statusCd", source = "qnaStatus")
    @Mapping(target = "categoryCd", source = "qnaCategory")
    @Mapping(target = "ntcrNm", source = "frstRegisterNm")
    @Mapping(target = "frstRegisterPnttm", source = "createdDate")
    @Mapping(target = "frstRegisterPnttmStr", source = "createdDate", qualifiedByName = "formatDate")
    @Mapping(target = "eventDateStr", source = "eventDate", qualifiedByName = "formatDateTime")
    @Mapping(target = "isExpired", source = "ntceEndYmd", qualifiedByName = "calculateExpired")
    @Mapping(target = "parnts", source = "parnts", qualifiedByName = "longToString")
    @Mapping(target = "bbsTtl", source = "bbsTtl")
    BoardDto toDto(BoardDetailResult detail);

    @Mapping(target = "nttId", ignore = true)
    @Mapping(target = "nttNo", constant = "1L")
    @Mapping(target = "parnts", constant = "0L")
    @Mapping(target = "useYn", source = "request.useYn", defaultValue = "Y")
    @Mapping(target = "qnaStatus", source = "request.qnaStatus", defaultValue = "OPEN")
    @Mapping(target = "eventDate", source = "request.eventDate", qualifiedByName = "parseDateTime")
    @Mapping(target = "inqireCo", constant = "0")
    @Mapping(target = "likeCo", constant = "0")
    @Mapping(target = "bbsId", source = "bbsId")
    @Mapping(target = "ntcrId", source = "ntcrId")
    @Mapping(target = "ntcrNm", source = "ntcrNm")
    @Mapping(target = "sortOrdr", source = "sortOrdr")
    Board toEntity(BoardSaveRequest request, String bbsId, String ntcrId, String ntcrNm, Long sortOrdr);

    @Mapping(target = "nttId", ignore = true)
    @Mapping(target = "nttNo", source = "nttNo")
    @Mapping(target = "parnts", source = "parnts")
    @Mapping(target = "useYn", source = "request.useYn", defaultValue = "Y")
    @Mapping(target = "qnaStatus", source = "request.qnaStatus", defaultValue = "OPEN")
    @Mapping(target = "eventDate", source = "request.eventDate", qualifiedByName = "parseDateTime")
    @Mapping(target = "inqireCo", constant = "0")
    @Mapping(target = "likeCo", constant = "0")
    @Mapping(target = "bbsId", source = "bbsId")
    @Mapping(target = "ntcrId", source = "ntcrId")
    @Mapping(target = "ntcrNm", source = "ntcrNm")
    @Mapping(target = "sortOrdr", source = "sortOrdr")
    Board toReplyEntity(BoardSaveRequest request, String bbsId, String ntcrId, String ntcrNm, Long sortOrdr, Long nttNo, Long parnts, Integer replyLc);

    @Named("longToString")
    default String longToString(Long value) {
        return value != null ? String.valueOf(value) : null;
    }

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
