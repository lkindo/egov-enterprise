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
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * ?고렪踰덊샇 愿由??쒕퉬??
 */
@Service("zipManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ZipManageService {

    private final ZipRepository zipRepository;

    /**
     * ?고렪踰덊샇 紐⑸줉 議고쉶
     */
    public List<ZipDto> selectZipList(ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = Objects.requireNonNull(PageRequest.of(pageIndex, pageUnit));

        Page<Zip> page;
        String keyword = searchVO.getSearchKeyword();
        if (keyword != null && !keyword.isEmpty()) {
            page = zipRepository.findAll(Objects.requireNonNull(pageable)); // Basic pagination, could enhance with
                                                                            // Specification
        } else {
            page = zipRepository.findAll(Objects.requireNonNull(pageable));
        }
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * ?고렪踰덊샇 紐⑸줉 珥?嫄댁닔
     */
    public int selectZipListTotCnt(ComDefaultVO searchVO) {
        return (int) zipRepository.count();
    }

    /**
     * ?고렪踰덊샇 ?곸꽭 議고쉶
     */
    public ZipDto selectZipDetail(ZipDto dto) {
        return zipRepository
                .findById(new ZipId(Objects.requireNonNull(dto.getZip()), Objects.requireNonNull(dto.getSn())))
                .map(this::toDto)
                .orElse(null);
    }

    /**
     * ?고렪踰덊샇 ?깅줉
     */
    @Transactional
    public void insertZip(ZipDto dto) {
        // ?먮룞 ?쇰젴踰덊샇 ?앹꽦
        List<Zip> existing = zipRepository.findByZip(Objects.requireNonNull(dto.getZip()));
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
        zipRepository.save(Objects.requireNonNull(entity));
    }

    /**
     * ?고렪踰덊샇 ?섏젙
     */
    @Transactional
    public void updateZip(ZipDto dto) {
        Zip entity = zipRepository
                .findById(new ZipId(Objects.requireNonNull(dto.getZip()), Objects.requireNonNull(dto.getSn())))
                .orElseThrow(() -> new RuntimeException("Zip not found"));
        entity.update(dto.getCtprvnNm(), dto.getSignguNm(), dto.getEmdNm(),
                dto.getLiBuldNm(), dto.getLnbrDongHo(), dto.getLastUpdusrId());
    }

    /**
     * ?고렪踰덊샇 ??젣
     */
    @Transactional
    public void deleteZip(ZipDto dto) {
        zipRepository.deleteById(new ZipId(Objects.requireNonNull(dto.getZip()), Objects.requireNonNull(dto.getSn())));
    }

    /**
     * ?고렪踰덊샇 寃??(?앹뾽??
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
