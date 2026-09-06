package nuri.business.service.user;

import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * 발송 채널의 esntlId → 연락처 해석 계약 — {@link UserContactService}.
 *
 * <p>순서 보존·중복 제거·미존재 거부·빈 연락처 정규화가 전부다. 한 명이라도 없으면 부분 발송 대신 전체를
 * 거부해야 한다 — "보냈다" 고 보이는 부분 실패가 가장 나쁜 결과다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserContactService — 수신자 연락처 해석")
class UserContactServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserContactService userContactService;

    @Test
    @DisplayName("요청 순서를 보존하고 중복·공백은 한 번만 해석하며, 빈 연락처는 null 로 정규화한다")
    void resolvesInRequestOrderWithNormalisedContacts() {
        given(userRepository.findByEsntlIdIn(any()))
                .willReturn(List.of(
                        user("USR_B", "을", " ", "01022223333"),
                        user("USR_A", "갑", "gap@example.com", null)));

        List<UserContactService.UserContact> contacts =
                userContactService.resolve(java.util.Arrays.asList("USR_A", " USR_B ", "USR_A", "", null));

        assertThat(contacts).extracting(UserContactService.UserContact::esntlId)
                .containsExactly("USR_A", "USR_B");
        assertThat(contacts.get(0).emlAddr()).isEqualTo("gap@example.com");
        assertThat(contacts.get(0).mblTelno()).isNull();
        assertThat(contacts.get(1).emlAddr()).isNull();
        assertThat(contacts.get(1).mblTelno()).isEqualTo("01022223333");
        assertThat(contacts.get(1).userNm()).isEqualTo("을");
    }

    @Test
    @DisplayName("🚨 하나라도 존재하지 않는 사용자가 있으면 전체를 거부한다 — 부분 발송 금지")
    void rejectsWhenAnyUserIsMissing() {
        given(userRepository.findByEsntlIdIn(any()))
                .willReturn(List.of(user("USR_A", "갑", "gap@example.com", null)));

        assertThatThrownBy(() -> userContactService.resolve(List.of("USR_A", "USR_GONE")))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("빈 입력은 저장소를 조회하지 않고 빈 목록을 돌려준다")
    void emptyInputSkipsRepository() {
        assertThat(userContactService.resolve(List.of())).isEmpty();
        assertThat(userContactService.resolve(null)).isEmpty();
        assertThat(userContactService.resolve(List.of(" ", ""))).isEmpty();
        verify(userRepository, never()).findByEsntlIdIn(anyCollection());
    }

    private static User user(String esntlId, String userNm, String emlAddr, String mblTelno) {
        // 엔티티 기본 생성자는 JPA 용 protected 다 — Spring 의 BeanUtils 가 접근 가능하게 만들어 생성한다.
        User user = org.springframework.beans.BeanUtils.instantiateClass(User.class);
        ReflectionTestUtils.setField(user, "esntlId", esntlId);
        ReflectionTestUtils.setField(user, "userNm", userNm);
        ReflectionTestUtils.setField(user, "emlAddr", emlAddr);
        ReflectionTestUtils.setField(user, "mblTelno", mblTelno);
        return user;
    }
}
