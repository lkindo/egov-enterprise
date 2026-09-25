package nuri.business.service.mail;

import nuri.business.domain.mail.SentMail;
import nuri.business.domain.mail.SentMailRepository;
import nuri.business.service.mail.dto.MailRecipientDto;
import nuri.business.service.mail.dto.SentMailDto;
import nuri.business.service.user.UserContactService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 메일 서비스 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MailService {

    private final SentMailRepository sentMailRepository;
    private final MailAsyncProcessor mailAsyncProcessor;
    /** esntlId → 이메일 해석(코어). 결과는 발송에만 쓰고 응답으로 내보내지 않는다. */
    private final UserContactService userContactService;

    /** 사용자 수신자의 이름을 모를 때 이력에 남기는 표시값. 주소를 대신 적지 않는다(DIP D8). */
    static final String UNNAMED_RECIPIENT = "(이름 미등록)";

    /**
     * 발송에 쓰는 시스템 메일 주소(SMTP {@code From}).
     *
     * <p>[2026-08-27] 종전에는 {@code dto.getDsptchPerson()} 을 그대로 {@code From} 으로 넘겼는데,
     * 메일 발송 화면은 발신자를 입력받지 않아 이 값이 **항상 null** 이었다. SMTP 가 설정된 배포에서는
     * {@code RealEmailSender.setFrom(Objects.requireNonNull(from))} 이 NPE 로 죽어 3회 재시도 후
     * 전건이 실패로 기록됐고, SMTP 미설정 환경에서는 {@code LoggingEmailSender} 가 예외 없이 끝나
     * '성공'으로 기록돼 그 결함이 검증 단계에서 드러나지 않았다.
     *
     * <p>발신 주소를 요청 본문이 아니라 설정에서 가져오면 그 실패가 원천 제거되고, 위조 가능한 축을
     * 클라이언트가 정하지 않게 된다. 운영에서 개인 주소를 {@code From} 에 넣으면 SPF/DMARC 로
     * 거부되므로 시스템 메일함 주소를 쓰는 것이 옳다. "누가 보냈는가" 는 별도로 이력에 남긴다.
     */
    @org.springframework.beans.factory.annotation.Value(
            "${nuri.mail.from:${spring.mail.username:no-reply@egov.local}}")
    private String systemSenderAddress;

    /** 제목 키워드 조회. 검색조건 "1"(제목)로 위임하여 발신자 스코프가 동일하게 적용되도록 한다. */
    public Page<SentMailDto> getSentMailList(String keyword, Pageable pageable) {
        return getSentMailList("1", keyword, Objects.requireNonNull(pageable));
    }

    public Page<SentMailDto> getSentMailList(String searchCondition, String searchKeyword, Pageable pageable) {
        log.debug("Searching sent mails");
        // [IDOR] 일반 사용자는 자신이 발송한 건만, 관리자는 전건 — 발송메일 전건 노출 차단
        String senderLoginId = resolveSenderScope();
        return sentMailRepository
                .searchSentMails(senderLoginId, searchCondition, searchKeyword, Objects.requireNonNull(pageable))
                .map(this::toResponse);
    }

    public SentMailDto getSentMail(Long emlDsptchSn) {
        log.debug("Fetching mail details for dispatch serial number: {}", emlDsptchSn);
        SentMail sentMail = sentMailRepository.findById(Objects.requireNonNull(emlDsptchSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrPermission(sentMail.getFrstRgtrId(), "MAIL_READ_ALL"); // [IDOR] 발신자/관리자만 열람
        return toResponse(sentMail);
    }

    /**
     * 응답 투영. <b>본문은 발신자 본인에게만 싣는다</b>(2026-09-25 DIP D8, GAP-DOMAIN-001 ①).
     *
     * <p>{@code MAIL_READ_ALL} 관리자는 전 사용자의 발송 이력을 조회하지만, 그 권한은 "누가 누구에게 언제
     * 보냈는가" 를 보는 권한이지 남의 편지를 읽는 권한이 아니다. 화면은 이미 본문을 보여 주지 않는데
     * (DEC-OPS-022·046) API 가 본문을 실어 보내면 발신 메일 첨부를 PERSONAL 로 막아 둔 경계
     * (FileAccessPolicy §5)를 옆으로 돌아가게 된다. 소유 축은 조회 스코프와 같은 {@code frstRgtrId}(loginId)다.
     */
    private SentMailDto toResponse(SentMail sentMail) {
        SentMailDto dto = SentMailDto.from(sentMail);
        if (dto != null && !isSender(sentMail)) {
            dto.setEmailCn(null);
        }
        return dto;
    }

    private static boolean isSender(SentMail sentMail) {
        String owner = sentMail.getFrstRgtrId();
        return owner != null && nuri.business.security.util.SecurityUtil.getCurrentLoginId()
                .map(owner::equals)
                .orElse(false);
    }

    /**
     * 발송메일 조회 스코프를 결정한다. 관리자(ADMIN/SYSTEM)는 전건({@code null}),
     * 일반 사용자는 자신의 loginId 로 한정한다.
     *
     * <p>소유 축은 감사 컬럼 {@code frstRgtrId}(=loginId, {@code LoginUserAuditorAware})이며
     * esntlId 가 아니다. — 백엔드 헌법 제8조(서비스 레이어 권한 재검증)</p>
     */
    private String resolveSenderScope() {
        if (nuri.business.security.util.SecurityUtil.hasPermission("MAIL_READ_ALL")) {
            return null;
        }
        return nuri.business.security.util.SecurityUtil.getCurrentLoginId()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ACCESS_DENIED));
    }

    @Transactional
    public Long sendMail(String userId, SentMailDto dto) {
        log.info("Mail dispatch requested");
        assertNoAttachment(dto);
        return dispatchAll(userId, dto, resolveRecipients(dto));
    }

    /**
     * 발행 측이 이미 해석한 주소로 1건을 보낸다 — 업무 이벤트({@code MailRequestedEvent}) 경로.
     *
     * <p>이력의 수신자 칸에는 {@code recipientName} 을 남긴다. 주소를 넘겨받았다고 그것을 이력에 적으면
     * 화면 발송(사용자 수신자 → 이름)과 이벤트 발송의 표시가 갈리고, 관리자 이력 조회가 주소록이 된다.
     */
    @Transactional
    public Long sendToResolvedAddress(String requesterId, SentMailDto dto, String address, String recipientName) {
        assertNoAttachment(dto);
        if (!hasText(address)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "수신자를 한 명 이상 지정해 주세요.");
        }
        return dispatchAll(requesterId, dto,
                List.of(new ResolvedRecipient(address.trim(), displayNameOf(recipientName))));
    }

    private Long dispatchAll(String userId, SentMailDto dto, List<ResolvedRecipient> recipients) {
        Long firstDispatchSn = null;
        for (ResolvedRecipient recipient : recipients) {
            Long emlDsptchSn = dispatchOne(userId, dto, recipient);
            if (firstDispatchSn == null) {
                firstDispatchSn = emlDsptchSn;
            }
        }
        log.info("Mail request registered successfully: {} dispatch(es), first serial number: {}",
                recipients.size(), firstDispatchSn);
        return firstDispatchSn;
    }

    /**
     * 메일 첨부는 발송되지 않는다 — 지정하면 거부한다(2026-09-25 DIP D8).
     *
     * <p>종전에는 {@code atchFileSn} 을 이력에만 저장하고 {@code EmailSender} 는 첨부를 싣지 않았다.
     * 발신자는 "첨부해서 보냈다" 고 믿고 수신자는 파일을 받지 못하는, 성공처럼 보이는 실패였다.
     * 첨부 발송을 만들기 전까지 약속하지 않는다. 기존 이력의 첨부 번호는 열람 판정용으로 남는다.
     */
    private static void assertNoAttachment(SentMailDto dto) {
        if (dto.getAtchFileSn() != null) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "메일 첨부 발송은 지원하지 않습니다. 파일은 게시판이나 쪽지로 공유해 주세요.");
        }
    }

    /**
     * 발송 1건의 대상. {@code address} 는 SMTP 수신 주소로만 쓰고, 이력의 수신자 칸에는
     * {@code displayName} 을 남긴다 — 사용자 수신자는 이름, 직접 입력한 주소는 그 주소다.
     */
    private record ResolvedRecipient(String address, String displayName) {
    }

    /**
     * 수신 주소 목록을 확정한다 — 요청 순서 보존, 같은 주소는 한 번만.
     *
     * <p>[2026-09-05 DEC-OPS-035] {@code recipients} 의 사용자(esntlId)는 코어 {@link UserContactService} 로
     * 이메일을 해석한다. 등록된 이메일이 없는 사용자가 하나라도 있으면 <b>이름을 밝히고 전체를 거부</b>한다 —
     * 일부만 보낸 뒤 "발송 요청되었습니다" 로 끝나는 것이 가장 나쁜 결과다. 종전 계약인
     * {@code recptnPerson}(주소 문자열 1건)은 그대로 받으며 발송 1건이 된다.
     */
    private List<ResolvedRecipient> resolveRecipients(SentMailDto dto) {
        List<MailRecipientDto> recipients = dto.getRecipients() == null ? List.of() : dto.getRecipients();
        List<String> esntlIds = new ArrayList<>();
        for (MailRecipientDto recipient : recipients) {
            boolean hasUser = hasText(recipient.getEsntlId());
            boolean hasAddress = hasText(recipient.getEmlAddr());
            if (hasUser == hasAddress) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                        "수신자는 사용자 또는 이메일 주소 중 하나로 지정해야 합니다.");
            }
            if (hasUser) {
                esntlIds.add(recipient.getEsntlId().trim());
            }
        }
        Map<String, UserContactService.UserContact> contacts = userContactService.resolve(esntlIds).stream()
                .collect(Collectors.toMap(UserContactService.UserContact::esntlId, Function.identity(),
                        (first, second) -> first));

        // 주소 → 이력 표시값. 같은 주소는 먼저 나온 수신자의 표시값으로 한 번만 보낸다.
        LinkedHashMap<String, String> byAddress = new LinkedHashMap<>();
        for (MailRecipientDto recipient : recipients) {
            if (hasText(recipient.getEsntlId())) {
                UserContactService.UserContact contact = contacts.get(recipient.getEsntlId().trim());
                if (contact == null || contact.emlAddr() == null) {
                    String name = contact == null ? recipient.getEsntlId().trim() : contact.userNm();
                    throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                            "'" + name + "' 님은 등록된 이메일 주소가 없어 메일을 보낼 수 없습니다.");
                }
                // 사용자 수신자의 이력 표시값은 이름이다 — 해석된 주소는 저장·응답하지 않는다(DIP D8).
                byAddress.putIfAbsent(contact.emlAddr(), displayNameOf(contact.userNm()));
            } else {
                String address = recipient.getEmlAddr().trim();
                byAddress.putIfAbsent(address, address);
            }
        }
        if (hasText(dto.getRecptnPerson())) {
            String address = dto.getRecptnPerson().trim();
            byAddress.putIfAbsent(address, address);
        }
        if (byAddress.isEmpty()) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "수신자를 한 명 이상 지정해 주세요.");
        }
        List<ResolvedRecipient> resolved = new ArrayList<>();
        byAddress.forEach((address, displayName) -> resolved.add(new ResolvedRecipient(address, displayName)));
        return resolved;
    }

    private static String displayNameOf(String userNm) {
        return hasText(userNm) ? userNm.trim() : UNNAMED_RECIPIENT;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    /**
     * 수신 주소 1건 = 발송 이력 1건. 수신자 칸({@code tb_eml_dsptch.rcvr_nm}, 100자)에 표시값을 남기고
     * 커밋 후 비동기 발송을 기동한다. SMTP 수신 주소는 이력이 아니라 비동기 발송에만 넘긴다.
     */
    private Long dispatchOne(String userId, SentMailDto dto, ResolvedRecipient recipient) {
        final String recptnPerson = recipient.address();
        String displayName = recipient.displayName();

        // 발신자 이력은 **인증 주체**에서 온다. 요청 본문의 dsptchPerson 은 화면이 채우지 않아 늘 null 이었고,
        // 채운다 해도 클라이언트가 스스로를 다른 사람이라 주장할 수 있는 축이다(게시글이 이미 같은 규칙을 쓴다).
        SentMail sentMail = Objects.requireNonNull(SentMail.builder()
                .emlTtl(dto.getSj())
                .emlCn(dto.getEmailCn())
                .sndptyNm(resolveSenderName(userId, dto))
                .rcvrNm(displayName.length() > 100 ? displayName.substring(0, 100) : displayName)
                .dsptchRsltCd("P") // Pending
                .build());

        SentMail savedMail = sentMailRepository.save(Objects.requireNonNull(sentMail));
        Long emlDsptchSn = Objects.requireNonNull(savedMail.getEmlDsptchSn(),
                "Generated email dispatch serial number must not be null");

        // 부모 트랜잭션 커밋 후 비동기 발송을 기동한다. 커밋 전 기동하면 processSending 의 REQUIRES_NEW
        // 새 트랜잭션이 미커밋 SentMail 을 못 봐(READ_COMMITTED) 상태 갱신이 스킵되어 'P' 로 영구 고착되던 문제 방지.
        final String subject = dto.getSj();
        final String emailCn = dto.getEmailCn();
        // SMTP From 은 설정된 시스템 주소다. 요청 본문에서 오지 않으므로 null 이 될 수 없다.
        final String dsptchPerson = systemSenderAddress;
        nuri.foundation.core.util.TransactionUtils.runAfterCommit(() -> {
            try {
                mailAsyncProcessor.processSending(emlDsptchSn, subject, emailCn, dsptchPerson, recptnPerson);
            } catch (RuntimeException rejected) {
                // @Async 본문 예외는 호출자에게 나오지 않는다. 여기서 보이는 예외는 제출 거부다.
                // 커밋된 P 행을 방치하지 않고 명시적 실패로 바꿔 운영자가 재처리할 수 있게 한다.
                log.error("Mail dispatch queue rejected dispatch serial number: {}, errorType: {}",
                        emlDsptchSn, rejected.getClass().getSimpleName());
                mailAsyncProcessor.markResult(emlDsptchSn, "F");
            }
        });
        return emlDsptchSn;
    }

    /**
     * 발신자 이력에 남길 이름을 정한다.
     *
     * <p>인증 주체({@code userId})가 정본이다. 내부 시스템 발송처럼 인증 주체가 없는 경로에서는
     * 호출자가 명시한 {@code dsptchPerson} 을, 그것도 없으면 시스템 주소를 남긴다 —
     * 어느 경우에도 이력의 발신자 칸이 비지 않게 한다(종전에는 화면 발송이 전부 null 이었다).
     *
     * <p>{@code tb_eml_dsptch.sndpty_nm} 은 100자다. 초과 입력이 저장 시점에 터지지 않도록 자른다.
     */
    private String resolveSenderName(String userId, SentMailDto dto) {
        String resolved = userId;
        if (resolved == null || resolved.isBlank()) {
            resolved = dto.getDsptchPerson();
        }
        if (resolved == null || resolved.isBlank()) {
            resolved = systemSenderAddress;
        }
        return resolved.length() > 100 ? resolved.substring(0, 100) : resolved;
    }

    @Transactional
    public void updateMailResult(Long emlDsptchSn, String resultCode) {
        SentMail sentMail = sentMailRepository.findById(Objects.requireNonNull(emlDsptchSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        sentMail.updateResult(resultCode);
    }

    @Transactional
    public void deleteMail(Long emlDsptchSn) {
        SentMail sentMail = sentMailRepository.findById(Objects.requireNonNull(emlDsptchSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        nuri.business.security.util.SecurityUtil.assertOwnerOrPermission(sentMail.getFrstRgtrId(), "MAIL_DELETE_ALL"); // [IDOR] 발신자/관리자만 삭제
        sentMailRepository.delete(Objects.requireNonNull(sentMail));
    }
}
