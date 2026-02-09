package egovframework.com.uss.ion.nts.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import com.company.project.domain.note.NoteTrnsmitDomainRepository;

import egovframework.com.uss.ion.nts.service.EgovNoteTrnsmitService;
import jakarta.annotation.Resource;

@Service("egovNoteTrnsmitService")
public class EgovNoteTrnsmitServiceImpl extends EgovAbstractServiceImpl implements EgovNoteTrnsmitService {

    @Resource(name = "noteTrnsmitDomainRepository")
    private NoteTrnsmitDomainRepository noteTrnsmitRepository;

    @Override
    public List<EgovMap> selectNoteTrnsmitList(egovframework.com.uss.ion.nts.service.NoteTrnsmit searchVO)
            throws Exception {
        return noteTrnsmitRepository.findAll().stream()
                .filter(e -> "N".equals(e.getDeleteAt()))
                .map(e -> {
                    EgovMap map = new EgovMap();
                    map.put("noteId", e.getNote() != null ? e.getNote().getNoteId() : null);
                    map.put("noteTrnsmitId", e.getNoteTrnsmitId());
                    map.put("trnsmiterId", e.getTrnsmiterId());
                    return map;
                }).collect(Collectors.toList());
    }

    @Override
    public int selectNoteTrnsmitListCnt(egovframework.com.uss.ion.nts.service.NoteTrnsmit searchVO) throws Exception {
        return (int) noteTrnsmitRepository.count();
    }

    @Override
    public Map<String, Object> selectNoteTrnsmitDetail(egovframework.com.uss.ion.nts.service.NoteTrnsmit searchVO)
            throws Exception {
        return noteTrnsmitRepository.findById(searchVO.getNoteTrnsmitId()).map(e -> {
            Map<String, Object> map = new HashMap<>();
            map.put("noteId", e.getNote().getNoteId());
            map.put("noteTrnsmitId", e.getNoteTrnsmitId());
            map.put("trnsmiterId", e.getTrnsmiterId());
            return map;
        }).orElseThrow(() -> processException("info.nodata.msg"));
    }

    @Override
    public void deleteNoteTrnsmit(egovframework.com.uss.ion.nts.service.NoteTrnsmit searchVO) throws Exception {
        noteTrnsmitRepository.findById(searchVO.getNoteTrnsmitId()).ifPresent(e -> {
            // e.delete(searchVO.getLastUpdusrId()); // delete logic might differ in Entity
            noteTrnsmitRepository.delete(e);
        });
    }

    @Override
    public void deleteNoteRecptn(egovframework.com.uss.ion.nts.service.NoteTrnsmit searchVO) throws Exception {
        // Implementation for deleting associated reception record if needed
    }

    @Override
    public List<EgovMap> selectNoteTrnsmitCnfirm(egovframework.com.uss.ion.nts.service.NoteTrnsmit searchVO)
            throws Exception {
        return List.of();
    }
}
