package nuri.business.service.informalsanction;

import static nuri.business.service.informalsanction.InformalSanctionReadAssembler.documentLabel;
import static nuri.business.service.informalsanction.InformalSanctionReadAssembler.pendingLink;
import static nuri.business.service.informalsanction.InformalSanctionReadAssembler.referencedLink;

import java.util.*;
import java.util.stream.Collectors;
import nuri.business.domain.informalsanction.*;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.informalsanction.event.SanctionStatusChangedEvent;
import nuri.foundation.core.event.NotificationRequestedEvent;
import org.springframework.context.ApplicationEventPublisher;

/**
 * [2026-11-27] 결재 알림 발행 — 결재 순서 도래, 최종 결과(신청자 이벤트·참조자 알림), 계정이 있는 받는 사람 고르기. 종전에는
 * {@link InformalSanctionService}(983줄) 한 파일에 결재 흐름·권한 검사와 섞여 있었다(품질 평가 A안 6번). 본문은 그대로 옮겼다.
 *
 * <p>권한 검사는 없다 — 서비스가 이미 권한을 확인한 결재 트랜잭션 안에서만 쓰인다. 서비스가 같은 협력 객체로 만든다(스프링 빈이
 * 아니다). 알림 이벤트는 같은 트랜잭션에서 발행된다.
 */
final class InformalSanctionNotifier {
    private final ApplicationEventPublisher eventPublisher;
    private final ApprovalRecipients approvalRecipients;
    private final InformalSanctionReferenceRepository referenceRepository;
    private final UserRepository userRepository;

    InformalSanctionNotifier(ApplicationEventPublisher eventPublisher, ApprovalRecipients approvalRecipients,
                             InformalSanctionReferenceRepository referenceRepository, UserRepository userRepository) {
        this.eventPublisher = eventPublisher;
        this.approvalRecipients = approvalRecipients;
        this.referenceRepository = referenceRepository;
        this.userRepository = userRepository;
    }

    void publishStageAvailable(InformalSanction sanction, List<InformalSanctionDetail> lines) {
        notifyExisting(UUID.randomUUID(), lines.stream().filter(d -> d.status() == ApprovalStatus.ACTIVE)
                        .map(d -> d.getId().getUserId()).toList(),
                "결재 순서 도래", documentLabel(sanction) + "를 확인해 주세요.", pendingLink(sanction.getIfmlAtrzSn()));
    }

    /**
     * [2026-11-19] 결재 알림은 실제로 계정이 있는 사람에게만 보낸다 — 이유와 범위는 {@link ApprovalRecipients}(참조자 결과 알림은
     * {@link #publishReferenceResult} 가 먼저 걸렀다). 받는 사람은 정렬해 순서를 고정한다.
     */
    List<String> existingUsers(Collection<String> candidates) {
        return approvalRecipients.existing(candidates);
    }

    void notifyExisting(UUID eventId, Collection<String> receivers, String title, String content, String link) {
        existingUsers(receivers).forEach(receiver -> eventPublisher.publishEvent(
                new NotificationRequestedEvent(eventId, receiver, title, content, link)));
    }

    void publishFinalStatus(InformalSanction sanction, String actor, String opinion,
                            List<InformalSanctionDetail> lines) {
        SanctionStatusChangedEvent event = new SanctionStatusChangedEvent(sanction.getIfmlAtrzSn(),
                sanction.getAplcntId(), actor, SanctionStatus.fromCode(sanction.getAprvYn()), opinion, sanction.getDocTtl(),
                sanction.getAtrzCycl());
        eventPublisher.publishEvent(event);
        publishReferenceResult(sanction, lines);
    }

    /**
     * [2026-10-04 D4] 최종 결과(승인 C·반려 R)를 지금 차수의 참조자에게 알린다 — 이 차수의 행이 있는 사람만이다(재상신 때 다시
     * 지정한 이전 차수 참조자도 이 차수의 행이 있으므로 받는다). 이 차수에 지정되지 않은 이전 차수 참조자는 계속 읽지만 이 알림은
     * 받지 않는다. 회수(W)는 이 경로를 타지 않는다. 기안자와 이 차수의 결재선 사람은 각자의 알림을 받으므로 뺀다. 결과
     * 알림(신청자)과 같은 eventId 를 쓰지 않는다 — 멱등 키가 (eventId, 받는 사람)이라 내용이 다른 같은 키는 업무 트랜잭션을
     * 되돌린다. 반려 사유는 싣지 않는다(본문 상한).
     *
     * <p>[개정 1] 실제로 있는 사용자에게만 보낸다. 참조 행은 사용자 삭제 뒤에도 남지만(사용자 FK 없음, V2_123) 알림 행
     * (tb_user_noti)은 사용자 FK 가 있고 이 업무 트랜잭션 안에서 저장된다 — 지워진 참조자에게 보내면 FK 위반으로 승인·반려
     * 전체가 되돌아가고, 참조는 지울 수 없어 회수 말고는 빠져나갈 길이 없다.
     */
    private void publishReferenceResult(InformalSanction sanction, List<InformalSanctionDetail> lines) {
        Set<String> excluded = lines.stream().map(d -> d.getId().getUserId()).collect(Collectors.toCollection(HashSet::new));
        excluded.add(sanction.getAplcntId());
        List<String> candidates = referenceRepository.findForDocuments(List.of(sanction.getIfmlAtrzSn())).stream()
                .filter(r -> r.designatedIn(sanction.getAtrzCycl()))
                .map(r -> r.getId().getUserId()).filter(userId -> !excluded.contains(userId))
                .distinct().sorted().toList();
        if (candidates.isEmpty()) return;
        Set<String> existing = userRepository.findAllById(candidates).stream().map(User::getEsntlId)
                .collect(Collectors.toSet());
        List<String> receivers = candidates.stream().filter(existing::contains).toList();
        if (receivers.isEmpty()) return;
        boolean approved = "C".equals(sanction.getAprvYn());
        String title = approved ? "결재가 완료되었습니다" : "결재가 반려되었습니다";
        String content = documentLabel(sanction) + (approved ? "가 최종 승인되었습니다." : "가 반려되었습니다.")
                + " 참조로 받은 문서입니다.";
        UUID eventId = UUID.randomUUID();
        receivers.forEach(receiver -> eventPublisher.publishEvent(new NotificationRequestedEvent(eventId, receiver,
                title, content, referencedLink(sanction.getIfmlAtrzSn()))));
    }
}
