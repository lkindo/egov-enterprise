package com.company.project.service.zip;

import com.company.project.domain.zip.Zip;
import com.company.project.domain.zip.ZipId;
import com.company.project.domain.zip.ZipRepository;
import com.company.project.service.zip.dto.ZipDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 우편번호 관리 서비스
 */
@Service("zipManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ZipManageService {

    private final ZipRepository zipRepository;

    /**
     * 우편번호 목록 조회
     */
    public List<ZipDto> selectZipList(ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);

        Page<Zip> page;
        String keyword = searchVO.getSearchKeyword();
        if (keyword != null && !keyword.isEmpty()) {
            page = zipRepository.findAll(pageable); // Basic pagination, could enhance with Specification
        } else {
            page = zipRepository.findAll(pageable);
        }
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * 우편번호 목록 총 건수
     */
    public int selectZipListTotCnt(ComDefaultVO searchVO) {
        return (int) zipRepository.count();
    }

    /**
     * 우편번호 상세 조회
     */
    public ZipDto selectZipDetail(ZipDto dto) {
        return zipRepository.findById(new ZipId(dto.getZip(), dto.getSn()))
                .map(this::toDto)
                .orElse(null);
    }

    /**
     * 우편번호 등록
     */
    @Transactional
    public void insertZip(ZipDto dto) {
        // 자동 일련번호 생성
        List<Zip> existing = zipRepository.findByZip(dto.getZip());
        int newSn = existing.isEmpty() ? 1 : existing.stream().mapToInt(Zip::getSn).max().orElse(0) + 1;

        Zip entity = Zip.builder()
                .zip(dto.getZip())
                .sn(newSn)
                .ctprvnNm(dto.getCtprvnNm())
                .signguNm(dto.getSignguNm())
                .emdNm(dto.getEmdNm())
                .liBuldNm(dto.getLiBuldNm())
                .lnbrDongHo(dto.getLnbrDongHo())
                .frstRegisterId(dto.getFrstRegisterId())
                .build();
        zipRepository.save(entity);
    }

    /**
     * 우편번호 수정
     */
    @Transactional
    public void updateZip(ZipDto dto) {
        Zip entity = zipRepository.findById(new ZipId(dto.getZip(), dto.getSn()))
                .orElseThrow(() -> new RuntimeException("Zip not found"));
        entity.update(dto.getCtprvnNm(), dto.getSignguNm(), dto.getEmdNm(),
                dto.getLiBuldNm(), dto.getLnbrDongHo(), dto.getLastUpdusrId());
    }

    /**
     * 우편번호 삭제
     */
    @Transactional
    public void deleteZip(ZipDto dto) {
        zipRepository.deleteById(new ZipId(dto.getZip(), dto.getSn()));
    }

    /**
     * 우편번호 검색 (팝업용)
     */
    public List<ZipDto> searchZip(String keyword) {
        if (keyword == null || keyword.isEmpty()) {
            return List.of();
        }
        return zipRepository.findByCtprvnNmContainingOrSignguNmContainingOrEmdNmContaining(
                keyword, keyword, keyword).stream().map(this::toDto).collect(Collectors.toList());
    }

    private ZipDto toDto(Zip entity) {
        return ZipDto.builder()
                .zip(entity.getZip())
                .sn(entity.getSn())
                .ctprvnNm(entity.getCtprvnNm())
                .signguNm(entity.getSignguNm())
                .emdNm(entity.getEmdNm())
                .liBuldNm(entity.getLiBuldNm())
                .lnbrDongHo(entity.getLnbrDongHo())
                .frstRegisterId(entity.getFrstRegisterId())
                .lastUpdusrId(entity.getLastUpdusrId())
                .build();
    }
}
