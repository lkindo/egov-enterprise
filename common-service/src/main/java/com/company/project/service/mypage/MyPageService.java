package com.company.project.service.mypage;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.mypage.MyPageContent;
import com.company.project.domain.mypage.MyPageContentRepository;
import com.company.project.service.mypage.dto.MyPageContentDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 留덉???씠吏 ??퉬???ы쁽?
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MyPageService implements EgovMyPageService {

    private final MyPageContentRepository myPageContentRepository;

    @Override
    public Page<MyPageContentDto> getContentList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        if (keyword == null || keyword.isEmpty()) {
            return myPageContentRepository.findAll(pageable).map(MyPageContentDto::from);
        }
        return myPageContentRepository.findByCntntsNmContaining(keyword, pageable).map(MyPageContentDto::from);
    }

    @Override
    public MyPageContentDto getContent(String cntntsId) {
        MyPageContent content = myPageContentRepository.findById(Objects.requireNonNull(cntntsId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return MyPageContentDto.from(Objects.requireNonNull(content));
    }

    @Override
    @Transactional
    public String createContent(String userId, MyPageContentDto dto) {
        String cntntsId = "MPC_" + String.format("%013d", System.currentTimeMillis());

        MyPageContent content = MyPageContent.builder()
                .cntntsId(cntntsId)
                .cntntsNm(dto.getCntntsNm())
                .cntntsLinkUrl(dto.getCntntsLinkUrl())
                .cntcUrl(dto.getCntcUrl())
                .cntntsDc(dto.getCntntsDc())
                .cntntsUseAt(dto.getCntntsUseAt())
                .frstRegisterId(userId)
                .build();

        myPageContentRepository.save(Objects.requireNonNull(content));
        return cntntsId;
    }

    @Override
    @Transactional
    public void updateContent(String cntntsId, String userId, MyPageContentDto dto) {
        MyPageContent content = myPageContentRepository.findById(Objects.requireNonNull(cntntsId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        content.update(dto.getCntntsNm(), dto.getCntntsLinkUrl(), dto.getCntcUrl(),
                dto.getCntntsDc(), dto.getCntntsUseAt(), userId);
    }

    @Override
    @Transactional
    public void deleteContent(String cntntsId) {
        MyPageContent content = myPageContentRepository.findById(Objects.requireNonNull(cntntsId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        myPageContentRepository.delete(Objects.requireNonNull(content));
    }

    @Override
    public List<MyPageContentDto> getActiveContents() {
        return myPageContentRepository.findByCntntsUseAt("Y").stream()
                .map(MyPageContentDto::from)
                .collect(Collectors.toList());
    }
}