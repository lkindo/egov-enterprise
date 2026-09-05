package nuri.business.service.user;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 발송 채널(메일·문자)이 <b>사용자 고유 ID(esntlId)를 연락처로 해석</b>하는 코어 서비스.
 *
 * <p>[왜 — 2026-09-05 DEC-OPS-035] 쪽지는 사용자 검색 피커로 사람을 고르는데, 메일·문자는 이메일 주소와
 * 전화번호를 손으로 치게 했다. 사용자 검색 응답({@code UserSearchDto})은 의도적으로 개인정보를 담지 않으므로
 * 화면이 주소를 알 수 없고, 그래서 서버가 esntlId 를 받아 주소로 바꿔야 한다. 이 서비스의 결과는 발송
 * 서비스 안에서만 소비되며 <b>API 응답으로 되돌아가지 않는다</b> — 피커가 사람을 고르는 권한이 연락처를
 * 읽는 권한으로 넓어지지 않게 하기 위해서다(H3).
 *
 * <p>없는 사용자는 조용히 건너뛰지 않고 {@code RESOURCE_NOT_FOUND} 로 거부한다 — 일부만 발송된 뒤 "보냈다"
 * 고 보이는 것이 가장 나쁜 결과다. 빈 연락처는 {@code null} 로 정규화해 호출부가 "없음" 을 한 가지 형태로만
 * 판정하게 한다.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class UserContactService {

    private final UserRepository userRepository;

    /** 해석된 연락처. {@code emlAddr}·{@code mblTelno} 는 미등록이면 {@code null} 이다. */
    public record UserContact(String esntlId, String userNm, String emlAddr, String mblTelno) {
    }

    /**
     * esntlId 목록을 요청 순서를 보존해 연락처로 해석한다(중복은 첫 번째만).
     *
     * @throws BusinessException RESOURCE_NOT_FOUND — 하나라도 존재하지 않는 사용자가 있을 때
     */
    public List<UserContact> resolve(Collection<String> esntlIds) {
        if (esntlIds == null || esntlIds.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<String> distinct = esntlIds.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(id -> !id.isEmpty())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (distinct.isEmpty()) {
            return List.of();
        }

        Map<String, User> byEsntlId = userRepository.findByEsntlIdIn(distinct).stream()
                .collect(Collectors.toMap(User::getEsntlId, Function.identity(), (first, second) -> first));

        List<UserContact> contacts = new ArrayList<>(distinct.size());
        for (String esntlId : distinct) {
            User user = byEsntlId.get(esntlId);
            if (user == null) {
                throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND,
                        "수신자로 지정한 사용자를 찾을 수 없습니다.");
            }
            contacts.add(new UserContact(user.getEsntlId(), user.getUserNm(),
                    blankToNull(user.getEmlAddr()), blankToNull(user.getMblTelno())));
        }
        return contacts;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
