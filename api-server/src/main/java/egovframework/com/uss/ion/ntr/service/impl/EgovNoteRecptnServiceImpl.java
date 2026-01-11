package egovframework.com.uss.ion.ntr.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import com.company.project.domain.note.NoteRecptn;
import com.company.project.domain.note.NoteRecptnDomainRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.ion.ntr.service.EgovNoteRecptnService;
// import egovframework.com.uss.ion.ntr.service.NoteRecptnVO;
import jakarta.annotation.Resource;

@Service("egovNoteRecptnService")
public class EgovNoteRecptnServiceImpl extends EgovAbstractServiceImpl implements EgovNoteRecptnService {

    @Resource(name = "noteRecptnDomainRepository")
    private NoteRecptnDomainRepository noteRecptnRepository;

    @Override
    public List<EgovMap> selectNoteRecptnList(egovframework.com.uss.ion.ntr.service.NoteRecptn searchVO)
            throws Exception {
        return noteRecptnRepository.findAll().stream()
                .map(e -> {
                    EgovMap map = new EgovMap();
                    map.put("noteId", e.getNote() != null ? e.getNote().getNoteId() : null);
                    map.put("noteTrnsmitId", e.getNoteTrnsmit() != null ? e.getNoteTrnsmit().getNoteTrnsmitId() : null);
                    map.put("noteRecptnId", e.getNoteRecptnId());
                    map.put("rcverId", e.getRcverId());
                    map.put("openYn", e.getOpenYn());
                    return map;
                }).collect(Collectors.toList());
    }

    @Override
    public int selectNoteRecptnListCnt(egovframework.com.uss.ion.ntr.service.NoteRecptn searchVO) throws Exception {
        return (int) noteRecptnRepository.count();
    }

    @Override
    public Map<String, Object> selectNoteRecptnDetail(egovframework.com.uss.ion.ntr.service.NoteRecptn searchVO)
            throws Exception {
        return noteRecptnRepository.findById(searchVO.getNoteRecptnId()).map(e -> {
            Map<String, Object> map = new HashMap<>();
            map.put("noteId", e.getNote().getNoteId());
            map.put("noteTrnsmitId", e.getNoteTrnsmit().getNoteTrnsmitId());
            map.put("noteRecptnId", e.getNoteRecptnId());
            map.put("rcverId", e.getRcverId());
            map.put("openYn", e.getOpenYn());
            return map;
        }).orElseThrow(() -> processException("info.nodata.msg"));
    }

    @Override
    public void deleteNoteRecptn(egovframework.com.uss.ion.ntr.service.NoteRecptn searchVO) throws Exception {
        noteRecptnRepository.deleteById(searchVO.getNoteRecptnId());
    }
}
