package com.company.project.service.mypage;

import com.company.project.service.mypage.dto.MyPageContentDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * 留덉씠?섏씠吏 ?쒕퉬???명꽣?섏씠??
 */
public interface EgovMyPageService {

    Page<MyPageContentDto> getContentList(String keyword, Pageable pageable);

    MyPageContentDto getContent(String cntntsId);

    String createContent(String userId, MyPageContentDto dto);

    void updateContent(String cntntsId, String userId, MyPageContentDto dto);

    void deleteContent(String cntntsId);

    List<MyPageContentDto> getActiveContents();
}
