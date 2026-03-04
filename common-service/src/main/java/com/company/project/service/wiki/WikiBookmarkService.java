package com.company.project.service.wiki;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.wiki.WikiBookmark;
import com.company.project.domain.wiki.WikiBookmarkRepository;
import com.company.project.service.wiki.dto.WikiBookmarkDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WikiBookmarkService implements EgovWikiBookmarkService {

    private final WikiBookmarkRepository wikiBookmarkRepository;

    @Override
    public Page<WikiBookmarkDto> getWikiBookmarkList(String userId, String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        if (keyword == null || keyword.isEmpty()) {
            return wikiBookmarkRepository.findByUserId(userId, pageable).map(WikiBookmarkDto::from);
        }
        return wikiBookmarkRepository.findByUserIdAndWikiBkmkNmContaining(userId, keyword, pageable)
                .map(WikiBookmarkDto::from);
    }

    @Override
    @Transactional
    public void insertWikiBookmark(String userId, String wikiBkmkNm) {
        if (checkDuplication(userId, wikiBkmkNm)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE);
        }

        String id = "WIK_" + String.format("%013d", System.currentTimeMillis());
        WikiBookmark entity = WikiBookmark.builder()
                .wikiBkmkId(id)
                .userId(userId)
                .wikiBkmkNm(wikiBkmkNm)
                .build();
        wikiBookmarkRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void deleteWikiBookmark(String wikiBkmkId) {
        wikiBookmarkRepository.deleteById(Objects.requireNonNull(wikiBkmkId));
    }

    @Override
    public boolean checkDuplication(String userId, String wikiBkmkNm) {
        return wikiBookmarkRepository.findByUserIdAndWikiBkmkNm(userId, wikiBkmkNm).isPresent();
    }
}
