package nuri.business.service.program;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.common.BaseSearchDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.program.Program;
import nuri.business.domain.program.ProgramRepository;
import nuri.business.service.program.dto.ProgramDto;
import nuri.business.service.program.dto.ProgramMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProgramService {

    private final ProgramRepository programRepository;
    private final ProgramMapper programMapper;

    /**
     * URL 인가 매니저. 이 서비스가 쓰는 {@code tb_prgrm_lst} 가 그 매니저의 URL→롤 매핑 원천이다.
     *
     * <p>[W1-04 후속] {@code DbUrlAuthorizationManager.evictCache()} 는 배선 전까지 <b>프로덕션 호출부가
     * 0건</b>이었다. 그래서 관리 화면에서 프로그램(URL)을 바꿔도 최대 5분(expireAfterWrite) 동안
     * 구(舊) 인가가 그대로 적용됐다 — 권한을 회수했는데 5분간 열려 있는 상태다.
     *
     * <p>{@code ObjectProvider} 인 이유: 이 빈은 api-server 의 {@code ApiSecurityConfig} 가 만들고
     * 그 설정에는 프로파일 조건이 걸려 있다. business-core 단독 컨텍스트(단위 테스트 등)에는 없다.
     */
    private final org.springframework.beans.factory.ObjectProvider<
            nuri.business.security.authorization.DbUrlAuthorizationManager> authorizationManagerProvider;

    /**
     * 인가 캐시를 무효화한다. <b>반드시 커밋 이후</b>여야 한다 —
     * 커밋 전에 비우면 아직 보이지 않는 데이터를 다시 캐싱해 무효화가 무의미해진다.
     */
    private void evictAuthorizationCacheAfterCommit() {
        nuri.foundation.core.util.TransactionUtils.runAfterCommit(
                () -> authorizationManagerProvider.ifAvailable(
                        nuri.business.security.authorization.DbUrlAuthorizationManager::evictCache));
    }

    /**
     * 프로그램 목록 조회
     */
    public List<ProgramDto> selectProgrmList(BaseSearchDto searchVO) {
        Pageable pageable = searchVO.toPageable(Sort.by("prgrmFileNm").ascending());
        String keyword = searchVO.getSearchKeyword();

        Page<Program> page;
        if (keyword != null && !keyword.isEmpty()) {
            page = programRepository.searchByKeyword(keyword, pageable);
        } else {
            page = programRepository.findAll(pageable);
        }

        return page.getContent().stream()
                .map(programMapper::toDto)
                .collect(Collectors.toList());
    }

    /**
     * 프로그램 목록 총 갯수 조회
     */
    public int selectProgrmListTotCnt(BaseSearchDto searchVO) {
        String keyword = searchVO.getSearchKeyword();
        if (keyword != null && !keyword.isEmpty()) {
            return (int) programRepository.searchByKeyword(keyword, PageRequest.of(0, 1)).getTotalElements();
        }
        return (int) programRepository.count();
    }

    /**
     * 프로그램 상세 조회
     */
    public ProgramDto selectProgrm(BaseSearchDto searchVO) {
        if (searchVO.getSearchKeyword() == null)
            // null 검색어는 '못 찾음'(404)이 아니라 '잘못된 입력'(400) — ENTITY_NOT_FOUND 404 전환에 맞춰 정정
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        return programRepository.findById(searchVO.getSearchKeyword())
                .map(programMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
    }

    public ProgramDto selectProgrmById(String prgrmFileNm) {
        return programRepository.findById(Objects.requireNonNull(prgrmFileNm))
                .map(programMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
    }

    /**
     * 프로그램 등록
     */
    @Transactional
    @CacheEvict(value = { "menuHierarchy", "rootMenuIdByUrl", "allMenuDtos" }, allEntries = true)
    public void insertProgrm(ProgramDto dto) {
        Program program = Program.builder()
                .prgrmFileNm(dto.getPrgrmFileNm())
                .prgrmStrgPath(dto.getPrgrmStrgPath())
                .prgrmKornNm(dto.getPrgrmKornNm())
                .url(dto.getUrl())
                .prgrmExpln(dto.getPrgrmExpln())
                .build();
        programRepository.save(Objects.requireNonNull(program));
        evictAuthorizationCacheAfterCommit();
    }

    /**
     * 프로그램 정보 수정
     */
    @Transactional
    @CacheEvict(value = { "menuHierarchy", "rootMenuIdByUrl", "allMenuDtos" }, allEntries = true)
    public void updateProgrm(ProgramDto dto) {
        Program program = programRepository.findById(Objects.requireNonNull(dto.getPrgrmFileNm()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
        program.update(dto.getPrgrmStrgPath(), dto.getPrgrmKornNm(), dto.getUrl(), dto.getPrgrmExpln());
        evictAuthorizationCacheAfterCommit();
    }

    /**
     * 프로그램 삭제
     */
    @Transactional
    @CacheEvict(value = { "menuHierarchy", "rootMenuIdByUrl", "allMenuDtos" }, allEntries = true)
    public void deleteProgrm(ProgramDto dto) {
        programRepository.deleteById(Objects.requireNonNull(dto.getPrgrmFileNm()));
        evictAuthorizationCacheAfterCommit();
    }

    /**
     * 프로그램 목록 멀티 삭제
     */
    @Transactional
    @CacheEvict(value = { "menuHierarchy", "rootMenuIdByUrl", "allMenuDtos" }, allEntries = true)
    public void deleteProgrmManageList(String checkedProgrmFileNmForDel) {
        if (checkedProgrmFileNmForDel == null)
            return;
        List<String> delProgrmFileNm = Arrays.asList(checkedProgrmFileNmForDel.split(","));
        programRepository.deleteAllByIdInBatch(Objects.requireNonNull(delProgrmFileNm));
        evictAuthorizationCacheAfterCommit();
    }
}
