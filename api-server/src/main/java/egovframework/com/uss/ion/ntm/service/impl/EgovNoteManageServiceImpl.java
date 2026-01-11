package egovframework.com.uss.ion.ntm.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestParam;

import com.company.project.domain.note.Note;
import com.company.project.domain.note.NoteRecptn;
import com.company.project.domain.note.NoteRecptnDomainRepository;
import com.company.project.domain.note.NoteDomainRepository;
import com.company.project.domain.note.NoteTrnsmit;
import com.company.project.domain.note.NoteTrnsmitDomainRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.ion.ntm.service.EgovNoteManageService;
import egovframework.com.uss.ion.ntm.service.NoteManageVO;
import jakarta.annotation.Resource;

@Service("egovNoteManageService")
public class EgovNoteManageServiceImpl extends EgovAbstractServiceImpl implements EgovNoteManageService {

    @Resource(name = "noteDomainRepository")
    private NoteDomainRepository noteRepository;

    @Resource(name = "noteTrnsmitDomainRepository")
    private NoteTrnsmitDomainRepository noteTrnsmitRepository;

    @Resource(name = "noteRecptnDomainRepository")
    private NoteRecptnDomainRepository noteRecptnRepository;

    @Resource(name = "egovNoteManageIdGnrService")
    private EgovIdGnrService idgenService;

    @Override
    public Map<?, ?> selectNoteManage(NoteManageVO noteManageVO) throws Exception {
        Map<String, Object> map = new HashMap<>();
        noteRepository.findById(noteManageVO.getNoteId()).ifPresent(entity -> {
            map.put("noteManage", toVO(entity));
        });
        return map;
    }

    @Override
    public void insertNoteManage(NoteManageVO noteManageVO, @RequestParam Map<?, ?> commandMap) throws Exception {
        String id = idgenService.getNextStringId();
        Note entity = Note.builder()
                .noteId(id)
                .noteSj(noteManageVO.getNoteSj())
                .noteCn(noteManageVO.getNoteCn())
                .frstRegisterId(noteManageVO.getFrstRegisterId())
                .build();
        noteRepository.save(entity);

        // 발신 정보 저장
        noteTrnsmitRepository.save(NoteTrnsmit.builder()
                .noteTrnsmitId(id)
                .note(entity)
                .trnsmiterId(noteManageVO.getFrstRegisterId())
                .frstRegisterId(noteManageVO.getFrstRegisterId())
                .build());

        // 수신 정보 저장
        if (noteManageVO.getRecptnEmpList() != null) {
            String[] rcverIds = noteManageVO.getRecptnEmpList().split(",");
            for (String rcverId : rcverIds) {
                noteRecptnRepository.save(NoteRecptn.builder()
                        .noteRecptnId(idgenService.getNextStringId())
                        .note(entity)
                        .rcverId(rcverId.trim())
                        .build());
            }
        }
    }

    @Override
    public List<EgovMap> selectNoteEmpListPopup(ComDefaultVO searchVO) throws Exception {
        return List.of();
    }

    @Override
    public int selectNoteEmpListPopupCnt(ComDefaultVO searchVO) throws Exception {
        return 0;
    }

    private NoteManageVO toVO(Note entity) {
        NoteManageVO vo = new NoteManageVO();
        vo.setNoteId(entity.getNoteId());
        vo.setNoteSj(entity.getNoteSj());
        vo.setNoteCn(entity.getNoteCn());
        vo.setFrstRegisterId(entity.getFrstRegisterId());
        if (entity.getFrstRegistPnttm() != null) {
            vo.setFrstRegisterPnttm(entity.getFrstRegistPnttm().toString());
        }
        return vo;
    }
}
