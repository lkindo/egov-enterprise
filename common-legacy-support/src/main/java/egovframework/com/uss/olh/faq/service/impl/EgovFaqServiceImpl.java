package egovframework.com.uss.olh.faq.service.impl;

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

import com.company.project.domain.faq.Faq;
import com.company.project.domain.faq.FaqRepository;

import egovframework.com.uss.olh.faq.service.EgovFaqService;
import egovframework.com.uss.olh.faq.service.FaqVO;
import jakarta.annotation.Resource;

@Service("egovFaqService")
public class EgovFaqServiceImpl extends EgovAbstractServiceImpl implements EgovFaqService {

	@Resource(name = "faqRepository")
	private FaqRepository faqRepository;

	/** ID Generation **/
	@Resource(name = "egovFaqManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<FaqVO> selectFaqList(FaqVO searchVO) {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "lastUpdusrPnttm"));

		Page<Faq> page;
		String keyword = searchVO.getSearchWrd();
		if (keyword != null && !keyword.isEmpty()) {
			page = faqRepository.searchByKeyword(keyword, pageable);
		} else {
			page = faqRepository.findAll(pageable);
		}

		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectFaqListCnt(FaqVO searchVO) {
		String keyword = searchVO.getSearchWrd();
		if (keyword != null && !keyword.isEmpty()) {
			return (int) faqRepository.searchByKeyword(keyword, PageRequest.of(0, 1)).getTotalElements();
		} else {
			return (int) faqRepository.count();
		}
	}

	@Override
	public FaqVO selectFaqDetail(FaqVO searchVO) throws Exception {
		// ????
		faqRepository.findById(searchVO.getFaqId()).ifPresent(faq -> {
			faq.increaseViewCount();
			faqRepository.save(faq);
		});

		return faqRepository.findById(searchVO.getFaqId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public void insertFaq(FaqVO faqVO) throws FdlException {
		String faqId = idgenService.getNextStringId();
		faqVO.setFaqId(faqId);
		faqRepository.save(toEntity(faqVO));
	}

	@Override
	public void updateFaq(FaqVO faqVO) {
		faqRepository.findById(faqVO.getFaqId()).ifPresent(faq -> {
			faq.update(faqVO.getQestnSj(), faqVO.getQestnCn(), faqVO.getAnswerCn(), faqVO.getAtchFileId(),
					faqVO.getLastUpdusrId());
			faqRepository.save(faq);
		});
	}

	@Override
	public void deleteFaq(FaqVO faqVO) {
		faqRepository.deleteById(faqVO.getFaqId());
	}

	private Faq toEntity(FaqVO vo) {
		return Faq.builder()
				.faqId(vo.getFaqId())
				.qestnSj(vo.getQestnSj())
				.qestnCn(vo.getQestnCn())
				.answerCn(vo.getAnswerCn())
				.atchFileId(vo.getAtchFileId())
				.frstRegisterId(vo.getFrstRegisterId())
				.build();
	}

	private FaqVO toVO(Faq entity) {
		FaqVO vo = new FaqVO();
		vo.setFaqId(entity.getFaqId());
		vo.setQestnSj(entity.getQestnSj());
		vo.setQestnCn(entity.getQestnCn());
		vo.setAnswerCn(entity.getAnswerCn());
		vo.setInqireCo(entity.getInqireCo() != null ? String.valueOf(entity.getInqireCo()) : "0");
		vo.setAtchFileId(entity.getAtchFileId());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm() != null ? entity.getFrstRegisterPnttm().toString() : "");
		vo.setLastUpdusrPnttm(entity.getLastUpdusrPnttm() != null ? entity.getLastUpdusrPnttm().toString() : "");
		return vo;
	}
}
