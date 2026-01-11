package com.company.project.service.news;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.news.News;
import com.company.project.domain.news.NewsDomainRepository;
import com.company.project.service.news.dto.NewsDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 뉴스정보 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NewsService implements EgovNewsService {

    private final NewsDomainRepository newsRepository;

    @Override
    public Page<NewsDto> getNewsList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return newsRepository.findAll(pageable).map(NewsDto::from);
        }
        return newsRepository.findByNewsSjContaining(keyword, pageable).map(NewsDto::from);
    }

    @Override
    public NewsDto getNews(String newsId) {
        return newsRepository.findById(newsId)
                .map(NewsDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createNews(String userId, NewsDto dto) {
        String newsId = "NEWS_" + String.format("%015d", System.currentTimeMillis());
        News news = News.builder()
                .newsId(newsId)
                .newsSj(dto.getNewsSj())
                .newsCn(dto.getNewsCn())
                .newsOrigin(dto.getNewsOrigin())
                .ntceDe(dto.getNtceDe())
                .atchFileId(dto.getAtchFileId())
                .frstRegisterId(userId)
                .build();
        newsRepository.save(news);
        return newsId;
    }

    @Override
    @Transactional
    public void updateNews(String newsId, String userId, NewsDto dto) {
        News news = newsRepository.findById(newsId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        news.update(dto.getNewsSj(), dto.getNewsCn(), dto.getNewsOrigin(), dto.getNtceDe(),
                dto.getAtchFileId(), userId);
    }

    @Override
    @Transactional
    public void deleteNews(String newsId) {
        newsRepository.deleteById(newsId);
    }
}
