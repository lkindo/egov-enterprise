package com.company.project.service.tir;

import com.company.project.service.tir.dto.TwitterDto;

public interface EgovTwitterService {
    TwitterDto getTwitterAccount(String userId);

    void registerTwitterAccount(TwitterDto dto);

    void updateTwitterAccount(TwitterDto dto);

    void deleteTwitterAccount(String userId);
}