package egovframework.com.uss.ion.rmm.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.notification.RoughMap;
import com.company.project.domain.notification.RoughMapRepository;

import egovframework.com.uss.ion.rmm.service.EgovRoughMapService;
import egovframework.com.uss.ion.rmm.service.RoughMapDefaultVO;
import egovframework.com.uss.ion.rmm.service.RoughMapVO;
import jakarta.annotation.Resource;

@Service("egovRoughMapService")
public class EgovRoughMapServiceImpl extends EgovAbstractServiceImpl implements EgovRoughMapService {

    @Resource(name = "roughMapRepository")
    private RoughMapRepository roughMapRepository;

    @Resource(name = "egovRoughMapIdGnrService")
    private EgovIdGnrService idgenService;

    @Override
    public List<EgovMap> selectRoughMapList(RoughMapDefaultVO searchVO) throws Exception {
        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
                Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
        Page<RoughMap> page = roughMapRepository.findAll(pageable);
        return page.getContent().stream().map(this::toEgovMap).collect(Collectors.toList());
    }

    @Override
    public int selectRoughMapListTotCnt(RoughMapDefaultVO searchVO) {
        return (int) roughMapRepository.count();
    }

    @Override
    public RoughMapVO selectRoughMapDetail(RoughMapVO searchVO) throws Exception {
        return roughMapRepository.findById(searchVO.getRoughMapId())
                .map(this::toVO)
                .orElseThrow(() -> processException("info.nodata.msg"));
    }

    @Override
    public void insertRoughMap(RoughMapVO searchVO) throws Exception {
        String id = idgenService.getNextStringId();
        searchVO.setRoughMapId(id);

        RoughMap entity = RoughMap.builder()
                .roughMapId(id)
                .roughMapSj(searchVO.getRoughMapSj())
                .roughMapAddress(searchVO.getRoughMapAddress())
                .la(searchVO.getLa())
                .lo(searchVO.getLo())
                .markerLa(searchVO.getMarkerLa())
                .markerLo(searchVO.getMarkerLo())
                .infoWindow(searchVO.getInfoWindow())
                .zoomLevel(searchVO.getZoomLevel())
                .build();

        roughMapRepository.save(entity);
    }

    @Override
    public void updateRoughMap(RoughMapVO searchVO) throws Exception {
        roughMapRepository.findById(searchVO.getRoughMapId()).ifPresent(entity -> {
            entity.update(searchVO.getRoughMapSj(), searchVO.getRoughMapAddress(), searchVO.getLa(), searchVO.getLo(),
                    searchVO.getMarkerLa(), searchVO.getMarkerLo(), searchVO.getZoomLevel(),
                    searchVO.getInfoWindow() != null ? Integer.parseInt(searchVO.getInfoWindow()) : null,
                    searchVO.getLastUpdusrId());
            roughMapRepository.save(entity);
        });
    }

    @Override
    public void deleteRoughMap(RoughMapVO searchVO) throws Exception {
        roughMapRepository.deleteById(searchVO.getRoughMapId());
    }

    private RoughMapVO toVO(RoughMap entity) {
        RoughMapVO vo = new RoughMapVO();
        vo.setRoughMapId(entity.getRoughMapId());
        vo.setRoughMapSj(entity.getRoughMapSj());
        vo.setRoughMapAddress(entity.getRoughMapAddress());
        vo.setLa(entity.getLa());
        vo.setLo(entity.getLo());
        vo.setMarkerLa(entity.getMarkerLa());
        vo.setMarkerLo(entity.getMarkerLo());
        vo.setInfoWindow(entity.getInfoWindow());
        vo.setZoomLevel(entity.getZoomLevel() != null ? String.valueOf(entity.getZoomLevel()) : null);
        vo.setFrstRegisterId(entity.getFrstRegisterId());
        if (entity.getFrstRegisterPnttm() != null) {
            vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm().toString());
        }
        return vo;
    }

    private EgovMap toEgovMap(RoughMap entity) {
        EgovMap map = new EgovMap();
        map.put("roughMapId", entity.getRoughMapId());
        map.put("roughMapSj", entity.getRoughMapSj());
        map.put("roughMapAddress", entity.getRoughMapAddress());
        return map;
    }
}
