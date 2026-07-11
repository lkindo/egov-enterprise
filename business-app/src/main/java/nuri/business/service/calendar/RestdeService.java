package nuri.business.service.calendar;

import nuri.business.service.calendar.dto.RestdeDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 휴일 관리 서비스 인터페이스
 */
public interface RestdeService {

    /**
     * 휴일 목록 조회 (QueryDSL 페이징 검색)
     * 
     * @param searchCondition 검색 조건 (1: 휴일일자, 2: 휴일명)
     * @param searchKeyword 검색어
     * @param pageable 페이징 정보
     * @return 휴일 목록 Page
     */
    Page<RestdeDto> getRestdeList(String searchCondition, String searchKeyword, Pageable pageable);

    /**
     * 휴일 상세 조회
     * 
     * @param hldySn 휴일 일련번호
     * @return 휴일 상세 정보 DTO
     */
    RestdeDto getRestde(Integer hldySn);

    /**
     * 휴일 신규 등록
     * 
     * @param dto 휴일 등록 정보 DTO
     * @return 생성된 휴일 일련번호 (hldySn)
     */
    Integer createRestde(RestdeDto dto);

    /**
     * 휴일 정보 수정
     * 
     * @param hldySn 휴일 일련번호
     * @param dto 휴일 수정 정보 DTO
     */
    void updateRestde(Integer hldySn, RestdeDto dto);

    /**
     * 휴일 정보 삭제
     * 
     * @param hldySn 휴일 일련번호
     */
    void deleteRestde(Integer hldySn);
}
