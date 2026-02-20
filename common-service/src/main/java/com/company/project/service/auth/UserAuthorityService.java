package com.company.project.service.auth;

import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.service.auth.dto.UserAuthorityDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * ?ъ슜??沅뚰븳 愿由??쒕퉬??
 */
@Service("projectUserAuthorityService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserAuthorityService {

    private final UserAuthorityRepository userAuthorityRepository;

    /**
     * ?ъ슜??沅뚰븳 紐⑸줉 議고쉶
     */
    public List<UserAuthorityDto> selectUserAuthorityList(ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);

        Page<UserAuthority> page = userAuthorityRepository.findAll(Objects.requireNonNull(pageable));
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * ?ъ슜??沅뚰븳 紐⑸줉 珥?嫄댁닔
     */
    public int selectUserAuthorityListTotCnt(ComDefaultVO searchVO) {
        return (int) userAuthorityRepository.count();
    }

    /**
     * ?ъ슜??沅뚰븳 ?곸꽭 議고쉶
     */
    public UserAuthorityDto selectUserAuthority(@NonNull String uniqId) {
        return userAuthorityRepository.findById(Objects.requireNonNull(uniqId))
                .map(this::toDto)
                .orElse(null);
    }

    /**
     * ?ъ슜??沅뚰븳 ?깅줉/?섏젙
     */
    @Transactional
    public void insertUserAuthority(@NonNull UserAuthorityDto dto) {
        UserAuthority entity = UserAuthority.builder()
                .uniqId(Objects.requireNonNull(dto.getUniqId()))
                .authorCode(dto.getAuthorCode())
                .mberTyCode(dto.getMberTyCode())
                .build();
        userAuthorityRepository.save(Objects.requireNonNull(entity));
    }

    @Transactional
    public void updateUserAuthority(@NonNull UserAuthorityDto dto) {
        UserAuthority entity = userAuthorityRepository.findById(Objects.requireNonNull(dto.getUniqId()))
                .orElseThrow(() -> new RuntimeException("UserAuthority not found: " + dto.getUniqId()));
        entity.update(dto.getAuthorCode(), dto.getMberTyCode());
    }

    /**
     * ?ъ슜??沅뚰븳 ??젣
     */
    @Transactional
    public void deleteUserAuthority(@NonNull String uniqId) {
        userAuthorityRepository.deleteById(Objects.requireNonNull(uniqId));
    }

    private UserAuthorityDto toDto(UserAuthority entity) {
        return UserAuthorityDto.builder()
                .uniqId(Objects.requireNonNull(entity.getUniqId()))
                .authorCode(entity.getAuthorCode())
                .mberTyCode(entity.getMberTyCode())
                .build();
    }
}
