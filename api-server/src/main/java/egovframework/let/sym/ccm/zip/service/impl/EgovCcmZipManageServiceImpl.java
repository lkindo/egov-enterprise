package egovframework.let.sym.ccm.zip.service.impl;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.zip.ZipId;
import com.company.project.domain.zip.ZipRepository;

import egovframework.let.sym.ccm.zip.service.EgovCcmZipManageService;
import egovframework.let.sym.ccm.zip.service.Zip;
import egovframework.let.sym.ccm.zip.service.ZipVO;
import lombok.RequiredArgsConstructor;

/**
 * 우편번호에 관한 서비스 구현 클래스 (JPA)
 */
@Service("ZipManageService")
@RequiredArgsConstructor
public class EgovCcmZipManageServiceImpl extends EgovAbstractServiceImpl implements EgovCcmZipManageService {

    private final ZipRepository zipRepository;

    @Override
    @Transactional
    public void deleteZip(Zip zip) throws Exception {
        ZipId id = new ZipId(zip.getZip(), zip.getSn());
        zipRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void deleteAllZip() throws Exception {
        zipRepository.deleteAll();
    }

    @Override
    @Transactional
    public void insertZip(Zip zip) throws Exception {
        com.company.project.domain.zip.Zip entity = com.company.project.domain.zip.Zip.builder()
                .zip(zip.getZip())
                .sn(zip.getSn())
                .ctprvnNm(zip.getCtprvnNm())
                .signguNm(zip.getSignguNm())
                .emdNm(zip.getEmdNm())
                .liBuldNm(zip.getLiBuldNm())
                .lnbrDongHo(zip.getLnbrDongHo())
                .frstRegisterId(zip.getFrstRegisterId())
                .lastUpdusrId(zip.getLastUpdusrId())
                .build();
        zipRepository.save(entity);
    }

    @Override
    @Transactional
    public void insertExcelZip(InputStream file) throws Exception {
        // Excel import functionality - simplified placeholder
        // TODO: Implement Excel parsing if needed
    }

    @Override
    @Transactional(readOnly = true)
    public Zip selectZipDetail(Zip zip) throws Exception {
        ZipId id = new ZipId(zip.getZip(), zip.getSn());
        return zipRepository.findById(id)
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<?> selectZipList(ZipVO searchVO) throws Exception {
        String keyword = searchVO.getSearchKeyword();
        if (keyword == null || keyword.isEmpty()) {
            return convertToVoList(zipRepository.findAll());
        }
        return convertToVoList(zipRepository.findByCtprvnNmContainingOrSignguNmContainingOrEmdNmContaining(
                keyword, keyword, keyword));
    }

    @Override
    @Transactional(readOnly = true)
    public int selectZipListTotCnt(ZipVO searchVO) throws Exception {
        return ((List<?>) selectZipList(searchVO)).size();
    }

    @Override
    @Transactional
    public void updateZip(Zip zip) throws Exception {
        ZipId id = new ZipId(zip.getZip(), zip.getSn());
        zipRepository.findById(id)
                .ifPresent(entity -> entity.update(zip.getCtprvnNm(), zip.getSignguNm(), zip.getEmdNm(),
                        zip.getLiBuldNm(), zip.getLnbrDongHo(), zip.getLastUpdusrId()));
    }

    private Zip convertToVo(com.company.project.domain.zip.Zip entity) {
        Zip vo = new Zip();
        vo.setZip(entity.getZip());
        vo.setSn(entity.getSn());
        vo.setCtprvnNm(entity.getCtprvnNm());
        vo.setSignguNm(entity.getSignguNm());
        vo.setEmdNm(entity.getEmdNm());
        vo.setLiBuldNm(entity.getLiBuldNm());
        vo.setLnbrDongHo(entity.getLnbrDongHo());
        return vo;
    }

    private List<Zip> convertToVoList(List<com.company.project.domain.zip.Zip> entities) {
        List<Zip> list = new ArrayList<>();
        for (com.company.project.domain.zip.Zip e : entities) {
            list.add(convertToVo(e));
        }
        return list;
    }
}
