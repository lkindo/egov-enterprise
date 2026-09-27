package nuri.business.service.code;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.code.CommonCodeChange;
import nuri.business.domain.code.CommonCodeChangeRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.code.dto.CommonCodeChangeDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.jspecify.annotations.NonNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * 공통코드 변경 이력 조회(2026-09-27 DIP B5 F11). 기록은 {@link CommonCodeService} 가 변경과 같은 트랜잭션에서 한다.
 *
 * <p>변경자는 이력의 esntlId 로 이름을 한 번에 찾는다(페이지 단위 한 번 조회). 연락처는 싣지 않는다.</p>
 */
@Service
@Transactional(readOnly = true)
public class CommonCodeChangeService extends BaseAbstractService {

    private final CommonCodeChangeRepository changeRepository;
    private final UserRepository userRepository;

    public CommonCodeChangeService(CommonCodeChangeRepository changeRepository, UserRepository userRepository) {
        this.changeRepository = required(changeRepository, "CommonCodeChangeRepository 는 null 일 수 없습니다");
        this.userRepository = required(userRepository, "UserRepository 는 null 일 수 없습니다");
    }

    /**
     * 최신순 이력. 그룹 ID 를 주면 그 그룹과 상세 코드의 이력만, 분류 코드를 주면 그 분류 자신의 이력만 준다.
     * 둘을 함께 주면 어느 쪽 이력인지 정할 수 없어 거부한다.
     */
    public Page<CommonCodeChangeDto> getChanges(String cdId, String clsfCd, @NonNull Pageable pageable) {
        boolean byGroup = StringUtils.hasText(cdId);
        boolean byClassification = StringUtils.hasText(clsfCd);
        if (byGroup && byClassification) {
            throw new BusinessException("그룹 ID 와 분류 코드는 함께 줄 수 없습니다.", CommonErrorCode.INVALID_INPUT_VALUE);
        }
        Page<CommonCodeChange> page = byGroup
                ? changeRepository.findByCdIdOrderByCrtDtDescComCdChgHstrySnDesc(cdId.trim(), pageable)
                : byClassification
                        ? changeRepository.findByChgTrgtTypeCdAndClsfCdOrderByCrtDtDescComCdChgHstrySnDesc("CLSF", clsfCd.trim(), pageable)
                        : changeRepository.findAllByOrderByCrtDtDescComCdChgHstrySnDesc(pageable);
        List<String> actors = page.getContent().stream()
                .map(CommonCodeChange::getChgUserIdntfr)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<String, String> names = actors.isEmpty() ? Map.of()
                : userRepository.findByEsntlIdIn(actors).stream()
                        .filter(user -> user.getUserNm() != null)
                        .collect(Collectors.toMap(User::getEsntlId, User::getUserNm, (first, ignored) -> first));
        Function<CommonCodeChange, CommonCodeChangeDto> toDto = change -> new CommonCodeChangeDto(
                change.getComCdChgHstrySn(), change.getChgTrgtTypeCd(), change.getChgTypeCd(),
                change.getClsfCd(), change.getCdId(), change.getDtlCd(), change.getChgArtclNm(),
                change.getChgBfrCn(), change.getChgAftrCn(),
                change.getChgUserIdntfr() == null ? null : names.get(change.getChgUserIdntfr()),
                change.getCrtDt());
        return page.map(toDto);
    }
}
