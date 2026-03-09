package com.company.project.service.mypage;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.mypage.MyPageContent;
import com.company.project.domain.mypage.MyPageContentRepository;
import com.company.project.service.mypage.dto.MyPageContentDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MyPageService {

    private final MyPageContentRepository myPageContentRepository;

    public List<MyPageContentDto> getAllContents() {
        return myPageContentRepository.findAll().stream()
                .map(MyPageContentDto::from)
                .collect(Collectors.toList());
    }

    public MyPageContentDto getContent(String cntntsId) {
        return myPageContentRepository.findById(Objects.requireNonNull(cntntsId))
                .map(MyPageContentDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public void createContent(String userId, MyPageContentDto dto) {
        String cntntsId = "CONT_" + UUID.randomUUID().toString().substring(0, 15);

        MyPageContent content = MyPageContent.builder()
                .cntntsId(cntntsId)
                .cntntsNm(dto.getCntntsNm())
                .cntntsLinkUrl(dto.getCntntsLinkUrl())
                .cntntsDc(dto.getCntntsDc())
                .cntntsUseAt(dto.getCntntsUseAt())
                .frstRegisterId(userId)
                .build();

        myPageContentRepository.save(content);
    }

    @Transactional
    public void updateContent(String cntntsId, String userId, MyPageContentDto dto) {
        MyPageContent content = myPageContentRepository.findById(Objects.requireNonNull(cntntsId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        content.update(dto.getCntntsNm(), dto.getCntntsLinkUrl(),
                dto.getCntntsDc(), dto.getCntntsUseAt(), userId);
    }

    @Transactional
    public void deleteContent(String cntntsId) {
        myPageContentRepository.deleteById(Objects.requireNonNull(cntntsId));
    }
}
