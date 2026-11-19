package nuri.business.service.informalsanction;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 결재 알림을 받을 수 있는 사람 — 지금 계정이 있는 사람만 고른다(2026-11-19).
 *
 * <p>결재선·기안자·보완 요청 행은 사용자 삭제 뒤에도 남지만(사용자 FK 없음) 알림 행(tb_user_noti)은 사용자 FK 가 있고 업무
 * 트랜잭션 안에서 저장된다. 지워진 사람에게 보내면 FK 위반으로 앞 단계 승인·반려·회수·결재자 변경·보완 요청이 모두 되돌아가 DB 를
 * 고치지 않고는 문서를 움직일 수 없었다. 알림 저장 쪽(NotificationService)에서 일괄로 거르지 않는다 — 다른 기능에서 식별자 축을
 * 잘못 넘긴 호출(로그인 ID 등)이 FK 위반으로 드러나는 신호를 지우지 않기 위해서다.
 *
 * <p>받는 사람은 esntlId 축이다. 사용 중지 계정은 거르지 않는다(계정이 있으면 알림 행은 저장된다).
 */
@Component
@RequiredArgsConstructor
public class ApprovalRecipients {

    private final UserRepository userRepository;

    /** 후보 가운데 계정이 있는 사람을 정렬해 돌려준다. null 과 중복은 뺀다. 조회는 한 번이다. */
    public List<String> existing(Collection<String> candidates) {
        List<String> ids = candidates.stream().filter(Objects::nonNull).distinct().sorted().toList();
        if (ids.isEmpty()) return List.of();
        Set<String> found = userRepository.findAllById(ids).stream().map(User::getEsntlId).collect(Collectors.toSet());
        return ids.stream().filter(found::contains).toList();
    }

    /** 한 사람의 계정이 있는가. */
    public boolean exists(String esntlId) {
        return esntlId != null && !existing(List.of(esntlId)).isEmpty();
    }
}
