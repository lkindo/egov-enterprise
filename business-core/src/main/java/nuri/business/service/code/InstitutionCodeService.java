package nuri.business.service.code;
import nuri.business.domain.code.exception.CodeErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.code.InstitutionCode;
import nuri.business.domain.code.InstitutionCodeRecptnLog;
import nuri.business.domain.code.InstitutionCodeRecptnLogRepository;
import nuri.business.repository.code.InstitutionCodeRepository;
import nuri.business.service.code.dto.InstitutionCodeDto;
import nuri.business.service.code.dto.InstitutionCodeRecptnDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import nuri.business.domain.common.BaseSearchDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.jspecify.annotations.NonNull;

@Service
@Transactional(readOnly = true)
public class InstitutionCodeService extends BaseAbstractService {

    /** 수신 이력의 '처리 완료' 구분값. 화면(InstitutionCodeClient)도 이 값으로 완료/대기를 판정한다. */
    private static final String PROC_SE_DONE = "1";

    private final InstitutionCodeRepository institutionCodeRepository;
    private final InstitutionCodeRecptnLogRepository institutionCodeRecptnLogRepository;

    public InstitutionCodeService(InstitutionCodeRepository institutionCodeRepository,
            InstitutionCodeRecptnLogRepository institutionCodeRecptnLogRepository) {
        this.institutionCodeRepository = required(institutionCodeRepository, "InstitutionCodeRepository 는 null 일 수 없습니다");
        this.institutionCodeRecptnLogRepository = required(institutionCodeRecptnLogRepository,
                "InstitutionCodeRecptnLogRepository 는 null 일 수 없습니다");
    }

    /**
     * 기관코드 목록을 검색 조건과 함께 한 페이지 조회한다.
     *
     * <p>[2026-08-28] 종전에는 목록과 총건수가 <b>서로 다른 질의</b>였고
     * {@code selectInstitutionCodeListTotCnt} 가 검색어를 무시한 채 전체 {@code count()} 를 돌려줬다.
     * 검색이 동작하기 시작하면 "3건이 보이는데 총 240건"처럼 어긋나므로, 두 값을 한 {@link Page} 에서
     * 함께 얻어 드리프트가 구조적으로 불가능하게 만든다.
     */
    @Transactional(readOnly = true)
    public Page<InstitutionCodeDto> selectInstitutionCodeList(@NonNull BaseSearchDto searchVO) {
        Pageable pageable = required(searchVO.toPageable(), "pageable 는 null 일 수 없습니다");
        return institutionCodeRepository.searchInstitutionCodes(
                searchVO.getSearchCondition(), searchVO.getSearchKeyword(), pageable)
                .map(this::toDto);
    }

    // [2026-10-07 제거] 원장 쓰기 3종(insertInstitutionCode·updateInstitutionCode·deleteInstitutionCode)과
    //   수신 로그 등록(insertInstitutionCodeRecptn)을 걷었다. 어떤 컨트롤러도 부르지 않아 배선된 적이
    //   없는 경로였다. 따라서 이 애플리케이션에는 기관코드 원장(tb_inst_cd)과 수신 로그에 행을 만드는
    //   경로가 없다 — 두 테이블의 행은 DB 직접 적재로만 들어온다. 이 서비스가 쓰는 것은 수신 처리의
    //   procSe 하나뿐이다(GAP-CODE-001).

    /**
     * 수신 이력을 기관코드 원장에 반영 완료로 표시한다.
     *
     * <p>[2026-08-28] 두 가지를 고친다.
     * <ul>
     *   <li>완료 여부를 <b>호출자가 보낸 {@code procSe}</b> 로 정하던 것을 서버 상수로 고정한다.
     *       호출자가 값을 빠뜨리면 {@code null} 로 덮어써 상태를 오히려 지웠다.</li>
     *   <li>대상이 없을 때 {@code ifPresent} 로 <b>조용히 통과</b>해 200 을 돌려주던 것을 예외로 바꾼다.
     *       화면은 "성공적으로 반영되었습니다" 를 띄우는데 아무것도 바뀌지 않는 상태였다.</li>
     * </ul>
     */
    /**
     * ⚠ 이 메서드는 <b>원장(tb_inst_cd)에 아무것도 쓰지 않는다.</b>
     *
     * <p>[2026-08-28] 이름과 화면 문구가 "원장 반영" 을 뜻하는 것처럼 읽혀 왔지만, 실제로 하는
     * 일은 수신 로그 한 행의 {@code procSe} 를 완료로 바꾸는 것뿐이다. 이 애플리케이션에는
     * 원장에 쓰는 경로가 없다 — 원장 행은 DB 직접 적재로만 들어온다.
     *
     * <p>수신 payload 를 원장에 적용하는 경로를 여기 만들지 않은 이유는 {@code chgSeCd}(변경구분)
     * 의 값 도메인이 저장소 어디에도 확정돼 있지 않기 때문이다 — 화면은 1/2/3 으로 해석하고
     * 이 모듈의 테스트는 "I" 를 쓴다. DB 주석은 '변경구분코드' 뿐이고 seed·enum·계약이 없다.
     * 근거 없이 해석하면 코어 데이터를 잘못 덮어쓰거나 지운다(AGENTS.md H4). 화면 문구는 실제
     * 동작으로 정정했고, 반영 경로 설계는 GAP-CODE-001 로 남긴다.
     */
    @Transactional
    public void updateInstitutionCodeRecptn(InstitutionCodeRecptnDto dto) {
        InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId id = new InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId(
                dto.getOcrnYmd(), dto.getInstCd(), dto.getJobSn());
        InstitutionCodeRecptnLog entity = institutionCodeRecptnLogRepository.findById(id)
                .orElseThrow(() -> new BusinessException(CodeErrorCode.CODE_NOT_FOUND));
        entity.updateProcessSe(PROC_SE_DONE, "SYSTEM");
    }

    /**
     * 수신 이력을 검색 조건과 함께 한 페이지 조회한다.
     *
     * <p>[2026-08-28] 종전에는 {@code findAll()} 로 <b>전량</b>을 반환하면서 컨트롤러가
     * {@code list.size()} 를 총건수로 썼다. 화면은 그 값으로 페이지 번호를 그렸으므로 2페이지를 눌러도
     * 같은 전체 목록이 다시 나왔다. 리포지터리에는 이미 페이징·검색 메서드가 있었고 쓰이지 않았을 뿐이다.
     */
    @Transactional(readOnly = true)
    public Page<InstitutionCodeRecptnDto> selectInstitutionCodeRecptnList(@NonNull BaseSearchDto searchVO) {
        Pageable pageable = required(searchVO.toPageable(), "pageable 는 null 일 수 없습니다");
        String keyword = searchVO.getSearchKeyword() == null ? "" : searchVO.getSearchKeyword();
        // 목록 탭과 같은 검색창을 쓰므로 검색 범위도 같아야 한다(기관명 또는 코드).
        return institutionCodeRecptnLogRepository
                .findByAllInstNmContainingOrIdInstCdContainingIgnoreCase(keyword, keyword, pageable)
                .map(this::toLogDto);
    }

    public InstitutionCodeDto selectInstitutionCodeDetail(InstitutionCodeDto dto) {
        return institutionCodeRepository.findById(dto.getInstCd())
                .map(this::toDto)
                .orElseThrow(() -> new BusinessException(
                        CodeErrorCode.CODE_NOT_FOUND, "기관코드를 찾을 수 없습니다: " + dto.getInstCd()));
    }

    /**
     * 기관차수 물리 도메인 수N2(Integer, V2_19) → API 계약(String) 경계 변환.
     * V2_16(sys_log prcs_tm)과 동일 패턴 — DTO 는 String 유지로 Breaking Change 차단.
     * 원장 쓰기 경로가 없으므로 반대 방향(String → Integer) 변환은 두지 않는다.
     */
    private static String formatInstCycl(Integer instCycl) {
        return instCycl == null ? null : String.valueOf(instCycl);
    }

    private InstitutionCodeDto toDto(InstitutionCode entity) {
        return InstitutionCodeDto.builder()
                .instCd(entity.getInstCd())
                .allInstNm(entity.getAllInstNm())
                .lwstInstNm(entity.getLwstInstNm())
                .instAbbrNm(entity.getInstAbbrNm())
                .odr(entity.getOdr())
                .ord(entity.getOrd())
                .instCycl(formatInstCycl(entity.getInstCycl()))
                .topInstCd(entity.getTopInstCd())
                .uprInstCd(entity.getUprInstCd())
                .reprsInstCd(entity.getReprsInstCd())
                .instTypeLclsf(entity.getInstTypeLclsf())
                .instTypeMclsf(entity.getInstTypeMclsf())
                .instTypeSclsf(entity.getInstTypeSclsf())
                .telno(entity.getTelno())
                .faxNo(entity.getFaxNo())
                .crtYmd(entity.getCrtYmd())
                .ablYmd(entity.getAblYmd())
                .ablYn(entity.getAblYn())
                .chgYmd(entity.getChgYmd())
                .chgTm(entity.getChgTm())
                .crtrYmd(entity.getCrtrYmd())
                .sortOrdr(entity.getSortOrdr())
                .build();
    }

    private InstitutionCodeRecptnDto toLogDto(InstitutionCodeRecptnLog entity) {
        return InstitutionCodeRecptnDto.builder()
                .ocrnYmd(entity.getId().getOcrnYmd())
                .instCd(entity.getId().getInstCd())
                .jobSn(entity.getId().getJobSn())
                .chgSeCd(entity.getChgSeCd())
                .procSe(entity.getProcSe())
                .etcCd(entity.getEtcCd())
                .allInstNm(entity.getAllInstNm())
                .lwstInstNm(entity.getLwstInstNm())
                .instAbbrNm(entity.getInstAbbrNm())
                .odr(entity.getOdr())
                .ord(entity.getOrd())
                .instCycl(formatInstCycl(entity.getInstCycl()))
                .topInstCd(entity.getTopInstCd())
                .uprInstCd(entity.getUprInstCd())
                .reprsInstCd(entity.getReprsInstCd())
                .instTypeLclsf(entity.getInstTypeLclsf())
                .instTypeMclsf(entity.getInstTypeMclsf())
                .instTypeSclsf(entity.getInstTypeSclsf())
                .telno(entity.getTelno())
                .faxNo(entity.getFaxNo())
                .crtYmd(entity.getCrtYmd())
                .ablYmd(entity.getAblYmd())
                .ablYn(entity.getAblYn())
                .chgYmd(entity.getChgYmd())
                .chgTm(entity.getChgTm())
                .crtrYmd(entity.getCrtrYmd())
                .sortOrdr(entity.getSortOrdr())
                .build();
    }
}
