package com.company.project.service.nws;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.news.News;
import com.company.project.domain.news.NewsDomainRepository;
import com.company.project.service.nws.dto.NewsDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NewsServiceImpl implements NewsService {

    private final NewsDomainRepository newsRepository;
    private final EgovIdGnrService egovNewsManageIdGnrService;

    @Override
    public Page<NewsDto> getNewsList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return newsRepository.findAll(Objects.requireNonNull(pageable)).map(NewsDto::from);
        }
        return newsRepository.findByNewsSjContaining(keyword, Objects.requireNonNull(pageable)).map(NewsDto::from);
    }

    @Override
    public NewsDto getNews(String newsId) {
        return newsRepository.findById(Objects.requireNonNull(newsId))
                .map(NewsDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createNews(String userId, NewsDto dto) {
        try {
            String newsId = egovNewsManageIdGnrService.getNextStringId();
            News news = News.builder()
                    .newsId(newsId)
                    .newsSj(dto.getNewsSj())
                    .newsCn(dto.getNewsCn())
                    .newsOrigin(dto.getNewsOrigin())
                    .ntceDe(dto.getNtceDe())
                    .atchFileId(dto.getAtchFileId())
                    .frstRegisterId(userId)
                    .build();
            newsRepository.save(Objects.requireNonNull(news));
            return newsId;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate news ID", e);
        }
    }

    @Override
    @Transactional
    public void updateNews(String newsId, String userId, NewsDto dto) {
        News news = newsRepository.findById(Objects.requireNonNull(newsId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        news.update(dto.getNewsSj(), dto.getNewsCn(), dto.getNewsOrigin(), dto.getNtceDe(),
                dto.getAtchFileId(), userId);
    }

    @Override
    @Transactional
    public void deleteNews(String newsId) {
        if (!newsRepository.existsById(Objects.requireNonNull(newsId))) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        newsRepository.deleteById(Objects.requireNonNull(newsId));
    }
}
