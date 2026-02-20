package egovframework.com.uss.olh.qna.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.cmmn.exception.FdlException;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.qna.Qna;
import com.company.project.domain.qna.QnaRepository;

import egovframework.com.uss.olh.qna.service.EgovQnaService;
import egovframework.com.uss.olh.qna.service.QnaVO;
import jakarta.annotation.Resource;

@Service("egovQnaService")
public class EgovQnaServiceImpl extends EgovAbstractServiceImpl implements EgovQnaService {

	@Resource(name = "qnaRepository")
	private QnaRepository qnaRepository;

	/** ID Generation **/
	@Resource(name = "egovQnaManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<QnaVO> selectQnaList(QnaVO searchVO) {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "lastUpdusrPnttm"));

		Page<Qna> page;
		String keyword = searchVO.getSearchWrd();
		if (keyword != null && !keyword.isEmpty()) {
			page = qnaRepository.searchByKeyword(keyword, pageable);
		} else {
			page = qnaRepository.findAll(pageable);
		}
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectQnaListCnt(QnaVO searchVO) {
		String keyword = searchVO.getSearchWrd();
		if (keyword != null && !keyword.isEmpty()) {
			return (int) qnaRepository.searchByKeyword(keyword, PageRequest.of(0, 1)).getTotalElements();
		} else {
			return (int) qnaRepository.count();
		}
	}

	@Override
	public QnaVO selectQnaDetail(QnaVO qnaVO) throws Exception {
		// ????
		updateQnaInqireCo(qnaVO);

		return qnaRepository.findById(qnaVO.getQaId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public void updateQnaInqireCo(QnaVO qnaVO) {
		qnaRepository.findById(qnaVO.getQaId()).ifPresent(qna -> {
			qna.increaseViewCount();
			qnaRepository.save(qna);
		});
	}

	@Override
	public void insertQna(QnaVO qnaVO) throws FdlException {
		String qaId = idgenService.getNextStringId();
		qnaVO.setQaId(qaId);
		qnaRepository.save(toEntity(qaId, qnaVO));
	}

	@Override
	public void updateQna(QnaVO qnaVO) {
		qnaRepository.findById(qnaVO.getQaId()).ifPresent(qna -> {
			qna.updateQuestion(qnaVO.getQestnSj(), qnaVO.getQestnCn(), qnaVO.getEmailAdres(), qnaVO.getAreaNo(),
					qnaVO.getMiddleTelno(), qnaVO.getEndTelno(), qnaVO.getLastUpdusrId());
			qnaRepository.save(qna);
		});
	}

	@Override
	public void deleteQna(QnaVO qnaVO) {
		qnaRepository.deleteById(qnaVO.getQaId());
	}

	@Override
	public List<QnaVO> selectQnaAnswerList(QnaVO searchVO) {
		return selectQnaList(searchVO);
	}

	@Override
	public int selectQnaAnswerListCnt(QnaVO searchVO) {
		return selectQnaListCnt(searchVO);
	}

	@Override
	public void updateQnaAnswer(QnaVO qnaVO) {
		qnaRepository.findById(qnaVO.getQaId()).ifPresent(qna -> {
			qna.answer(qnaVO.getAnswerCn(), qnaVO.getLastUpdusrId());
			qnaRepository.save(qna);
		});
	}

	private Qna toEntity(String id, QnaVO vo) {
		return Qna.builder()
				.qaId(id)
				.qestnSj(vo.getQestnSj())
				.qestnCn(vo.getQestnCn())
				.wrterNm(vo.getWrterNm())
				.emailAdres(vo.getEmailAdres())
				.emailAnswerAt(vo.getEmailAnswerAt())
				.areaNo(vo.getAreaNo())
				.middleTelno(vo.getMiddleTelno())
				.endTelno(vo.getEndTelno())
				.frstRegisterId(vo.getFrstRegisterId())
				.build();
	}

	private QnaVO toVO(Qna entity) {
		QnaVO vo = new QnaVO();
		vo.setQaId(entity.getQaId());
		vo.setQestnSj(entity.getQestnSj());
		vo.setQestnCn(entity.getQestnCn());
		vo.setWrterNm(entity.getWrterNm());
		vo.setEmailAdres(entity.getEmailAdres());
		vo.setEmailAnswerAt(entity.getEmailAnswerAt());
		vo.setAreaNo(entity.getAreaNo());
		vo.setMiddleTelno(entity.getMiddleTelno());
		vo.setEndTelno(entity.getEndTelno());
		vo.setQnaProcessSttusCode(entity.getQnaProcessSttusCode());
		vo.setInqireCo(entity.getInqireCo() != null ? String.valueOf(entity.getInqireCo()) : "0");
		vo.setAnswerCn(entity.getAnswerCn());
		vo.setAnswerDe(entity.getAnswerDe());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm() != null ? entity.getFrstRegisterPnttm().toString() : "");
		vo.setLastUpdusrPnttm(entity.getLastUpdusrPnttm() != null ? entity.getLastUpdusrPnttm().toString() : "");
		return vo;
	}
}
