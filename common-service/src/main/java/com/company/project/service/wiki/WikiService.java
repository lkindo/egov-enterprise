package com.company.project.service.wiki;

import com.company.project.domain.wiki.WikiBookmark;
import com.company.project.domain.wiki.WikiBookmarkRepository;
import com.company.project.service.wiki.dto.WikiBookmarkDto;
import lombok.RequiredArgsConstructor;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WikiService implements EgovWikiService {

    private final WikiBookmarkRepository wikiBookmarkRepository;

    @Override
    @Transactional
    public void registerBookmark(WikiBookmarkDto dto) {
        WikiBookmark bookmark = WikiBookmark.builder()
                .wikiBkmkId(dto.getWikiBkmkId())
                .userId(dto.getUserId())
                .wikiBkmkNm(dto.getWikiBkmkNm())
                .frstRegisterId(dto.getUserId())
                .lastUpdusrId(dto.getUserId())
                .build();
        wikiBookmarkRepository.save(Objects.requireNonNull(bookmark));
    }

    @Override
    @Transactional
    public void deleteBookmark(String wikiBkmkId) {
        wikiBookmarkRepository.deleteById(Objects.requireNonNull(wikiBkmkId));
    }

    @Override
    public Page<WikiBookmarkDto> getBookmarkList(String userId, Pageable pageable) {
        Objects.requireNonNull(pageable);
        // userId 기반 필터링 로직 (Repository 확장 필요)
        return wikiBookmarkRepository.findAll(pageable)
                .map(b -> WikiBookmarkDto.builder()
                        .wikiBkmkId(b.getWikiBkmkId())
                        .userId(b.getUserId())
                        .wikiBkmkNm(b.getWikiBkmkNm())
                        .build());
    }

    @Override
    public boolean isDuplicated(String userId, String wikiBkmkNm) {
        // 중복 체크 로직 (Repository 확장 필요)
        return false;
    }
}
