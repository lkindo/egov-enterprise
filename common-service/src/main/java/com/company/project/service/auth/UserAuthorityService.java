package com.company.project.service.auth;

import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.service.auth.dto.UserAuthorityDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 사용자 권한 관리 서비스
 */
@Service("projectUserAuthorityService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserAuthorityService {

    private final UserAuthorityRepository userAuthorityRepository;

    /**
     * 사용자 권한 목록 조회
     */
    public List<UserAuthorityDto> selectUserAuthorityList(ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);

        Page<UserAuthority> page = userAuthorityRepository.findAll(pageable);
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * 사용자 권한 목록 총 건수
     */
    public int selectUserAuthorityListTotCnt(ComDefaultVO searchVO) {
        return (int) userAuthorityRepository.count();
    }

    /**
     * 사용자 권한 상세 조회
     */
    public UserAuthorityDto selectUserAuthority(String uniqId) {
        return userAuthorityRepository.findById(uniqId)
                .map(this::toDto)
                .orElse(null);
    }

    /**
     * 사용자 권한 등록/수정
     */
    @Transactional
    public void insertUserAuthority(UserAuthorityDto dto) {
        UserAuthority entity = UserAuthority.builder()
                .uniqId(dto.getUniqId())
                .authorCode(dto.getAuthorCode())
                .mberTyCode(dto.getMberTyCode())
                .build();
        userAuthorityRepository.save(entity);
    }

    @Transactional
    public void updateUserAuthority(UserAuthorityDto dto) {
        UserAuthority entity = userAuthorityRepository.findById(dto.getUniqId())
                .orElseThrow(() -> new RuntimeException("UserAuthority not found: " + dto.getUniqId()));
        entity.update(dto.getAuthorCode(), dto.getMberTyCode());
    }

    /**
     * 사용자 권한 삭제
     */
    @Transactional
    public void deleteUserAuthority(String uniqId) {
        userAuthorityRepository.deleteById(uniqId);
    }

    private UserAuthorityDto toDto(UserAuthority entity) {
        return UserAuthorityDto.builder()
                .uniqId(entity.getUniqId())
                .authorCode(entity.getAuthorCode())
                .mberTyCode(entity.getMberTyCode())
                .build();
    }
}
