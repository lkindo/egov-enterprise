package egovframework.com.uss.ion.tir.service.impl;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import com.company.project.domain.notification.TwitterAccount;
import com.company.project.domain.notification.TwitterAccountRepository;
import com.company.project.service.tir.EgovTwitterService;
import com.company.project.service.tir.dto.TwitterDto;

import jakarta.annotation.Resource;

@Service("egovTwitterService")
public class EgovTwitterServiceImpl extends EgovAbstractServiceImpl implements EgovTwitterService {

    @Resource(name = "twitterAccountRepository")
    private TwitterAccountRepository twitterAccountRepository;

    @Override
    public TwitterDto getTwitterAccount(String userId) {
        return twitterAccountRepository.findById(userId).map(e -> {
            return TwitterDto.builder()
                    .userId(e.getUserId())
                    .cnsmrKey(e.getCnsmrKey())
                    .cnsmrSecret(e.getCnsmrSecret())
                    .build();
        }).orElse(null);
    }

    @Override
    public void registerTwitterAccount(TwitterDto dto) {
        TwitterAccount entity = TwitterAccount.builder()
                .userId(dto.getUserId())
                .cnsmrKey(dto.getCnsmrKey())
                .cnsmrSecret(dto.getCnsmrSecret())
                .frstRegisterId(dto.getUserId())
                .build();
        twitterAccountRepository.save(entity);
    }

    @Override
    public void updateTwitterAccount(TwitterDto dto) {
        twitterAccountRepository.findById(dto.getUserId()).ifPresent(entity -> {
            entity.update(dto.getCnsmrKey(), dto.getCnsmrSecret(), dto.getUserId());
            twitterAccountRepository.save(entity);
        });
    }

    @Override
    public void deleteTwitterAccount(String userId) {
        twitterAccountRepository.deleteById(userId);
    }
}
