package com.company.project.service.tir;

import com.company.project.domain.tir.Twitter;
import com.company.project.domain.tir.TwitterRepository;
import com.company.project.service.tir.dto.TwitterDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TwitterService implements EgovTwitterService {

    private final TwitterRepository twitterRepository;

    @Override
    public TwitterDto getTwitterAccount(String userId) {
        return twitterRepository.findById(userId)
                .map(t -> TwitterDto.builder()
                        .userId(t.getUserId())
                        .cnsmrKey(t.getCnsmrKey())
                        .cnsmrSecret(t.getCnsmrSecret())
                        .build())
                .orElse(null);
    }

    @Override
    @Transactional
    public void registerTwitterAccount(TwitterDto dto) {
        Twitter twitter = Twitter.builder()
                .userId(dto.getUserId())
                .cnsmrKey(dto.getCnsmrKey())
                .cnsmrSecret(dto.getCnsmrSecret())
                .frstRegisterId(dto.getUserId())
                .lastUpdusrId(dto.getUserId())
                .build();
        twitterRepository.save(twitter);
    }

    @Override
    @Transactional
    public void updateTwitterAccount(TwitterDto dto) {
        twitterRepository.findById(dto.getUserId())
                .ifPresent(t -> {
                    // Twitter 엔티티에 update 메소드 추가 필요 시 반영
                });
    }

    @Override
    @Transactional
    public void deleteTwitterAccount(String userId) {
        twitterRepository.deleteById(userId);
    }
}
