package com.company.project.service.user;

import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;

import java.util.List;

/**
 * ?ъ슜??愿由??쒕퉬???명꽣?섏씠??
 * - ?꾩옄?뺣??꾨젅?꾩썙??5.0 ?명솚???몄쬆 ?붽굔 異⑹”???꾪븳 ?명꽣?섏씠??遺꾨━
 */
public interface EgovUserService {

    /**
     * ?ъ슜??紐⑸줉 議고쉶
     */
    List<UserDto> getUserList();

    /**
     * ?ъ슜??紐⑸줉 ?섏씠吏?議고쉶
     */
    Page<UserDto> getPagedUserList(@NonNull Pageable pageable);

    /**
     * ?ъ슜???곸꽭 議고쉶
     */
    UserDto getUserById(@NonNull String userId);

    /**
     * ?ъ슜???깅줉
     */
    String registerUser(@NonNull String userId, @NonNull String password, @NonNull String userNm,
            String passwordHint, String passwordCnsr,
            com.company.project.domain.user.entity.Role role);

    /**
     * ?ъ슜???뚯썝媛??
     */
    UserResponse signup(UserSignupRequest request);

    /**
     * 鍮꾨?踰덊샇 寃利?
     */
    boolean verifyPassword(@NonNull String rawPassword, @NonNull String encodedPassword);

    /**
     * ?ъ슜???뺣낫 ?섏젙
     */
    void updateUser(@NonNull String userId, @NonNull UserDto userDto);

    /**
     * ?ъ슜????젣
     */
    void deleteUser(@NonNull String userId);
}
