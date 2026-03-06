package com.company.project.service.news;

import com.company.project.service.news.dto.NewsDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 뉴스 관리 서비스 인터페이스
 */
public interface NewsService {
    /**
     * 뉴스 목록 조회
     *
     * @param keyword  검색어 (제목 기준)
     * @param pageable 페이징 정보
     * @return 뉴스 목록 페이지
     */
    Page<NewsDto> getNewsList(String keyword, Pageable pageable);

    /**
     * 뉴스 상세 조회
     *
     * @param newsId 뉴스 ID
     * @return 뉴스 상세 정보
     */
    NewsDto getNews(String newsId);

    /**
     * 뉴스 생성
     *
     * @param userId 등록자 ID
     * @param dto    뉴스 데이터
     * @return 생성된 뉴스 ID
     */
    String createNews(String userId, NewsDto dto);

    /**
     * 뉴스 정보 수정
     *
     * @param newsId 뉴스 ID
     * @param userId 수정자 ID
     * @param dto    수정 데이터
     */
    void updateNews(String newsId, String userId, NewsDto dto);

    /**
     * 뉴스 삭제
     *
     * @param newsId 뉴스 ID
     */
    void deleteNews(String newsId);
}
