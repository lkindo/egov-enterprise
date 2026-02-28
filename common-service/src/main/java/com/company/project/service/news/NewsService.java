package com.company.project.service.news;

import com.company.project.service.news.dto.NewsDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface NewsService {
    Page<NewsDto> getNewsList(String keyword, Pageable pageable);

    NewsDto getNews(String newsId);

    String createNews(String userId, NewsDto dto);

    void updateNews(String newsId, String userId, NewsDto dto);

    void deleteNews(String newsId);
}
