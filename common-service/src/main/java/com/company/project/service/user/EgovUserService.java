package com.company.project.service.user;

import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;

import java.util.List;

/**
 * ??????????퉬???명꽣??씠??
 * - ?꾩옄???꾨젅?꾩썙??5.0 ?명솚???몄쬆 ?붽굔 ?⑹????꾪븳 ?명꽣??씠???꾨?? */
public interface EgovUserService {

    /**
     * ?????紐⑸?議고??     */
    List<UserDto> getUserList();

    /**
     * ?????紐⑸???씠?議고??     */
    Page<UserDto> getPagedUserList(@NonNull Pageable pageable);

    /**
     * ??????곸꽭 議고??     */
    UserDto getUserById(@NonNull String userId);

    /**
     * ??????깅줉
     */
    String registerUser(@NonNull String userId, @NonNull String password, @NonNull String userNm,
            String passwordHint, String passwordCnsr,
            com.company.project.domain.user.entity.Role role);

    /**
     * ????????媛??
     */
    UserResponse signup(UserSignupRequest request);

    /**
     * ???踰덊??寃?
     */
    boolean verifyPassword(@NonNull String rawPassword, @NonNull String encodedPassword);

    /**
     * ??????뺣낫 ??젙
     */
    void updateUser(@NonNull String userId, @NonNull UserDto userDto);

    /**
     * ?????????     */
    void deleteUser(@NonNull String userId);
}
