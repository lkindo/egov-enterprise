package egovframework.com.uss.olh.wor.service.impl;

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

import com.company.project.domain.help.WordDicary;
import com.company.project.domain.help.WordDicaryRepository;

import egovframework.com.uss.olh.wor.service.EgovWordDicaryService;
import egovframework.com.uss.olh.wor.service.WordDicaryVO;
import jakarta.annotation.Resource;

@Service("egovWordDicaryService")
public class EgovWordDicaryServiceImpl extends EgovAbstractServiceImpl implements EgovWordDicaryService {

	@Resource(name = "wordDicaryRepository")
	private WordDicaryRepository wordDicaryRepository;

	@Resource(name = "egovWordDicaryIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public WordDicaryVO selectWordDicaryDetail(WordDicaryVO vo) throws Exception {
		return wordDicaryRepository.findById(vo.getWordId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public List<WordDicaryVO> selectWordDicaryList(WordDicaryVO searchVO) {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<WordDicary> page = wordDicaryRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectWordDicaryListCnt(WordDicaryVO searchVO) {
		return (int) wordDicaryRepository.count();
	}

	@Override
	public void insertWordDicary(WordDicaryVO vo) throws FdlException {
		try {
			String id = idgenService.getNextStringId();
			vo.setWordId(id);

			WordDicary entity = WordDicary.builder()
					.wordId(id)
					.wordNm(vo.getWordNm())
					.engNm(vo.getEngNm())
					.wordDc(vo.getWordDc())
					.synonm(vo.getSynonm())
					.frstRegisterId(vo.getFrstRegisterId())
					.build();

			wordDicaryRepository.save(entity);
		} catch (Exception e) {
			throw new FdlException("error.msg", e);
		}
	}

	@Override
	public void updateWordDicary(WordDicaryVO vo) {
		wordDicaryRepository.findById(vo.getWordId()).ifPresent(entity -> {
			entity.update(
					vo.getWordNm(),
					vo.getEngNm(),
					vo.getWordDc(),
					vo.getSynonm(),
					vo.getLastUpdusrId());
			wordDicaryRepository.save(entity);
		});
	}

	@Override
	public void deleteWordDicary(WordDicaryVO vo) {
		wordDicaryRepository.deleteById(vo.getWordId());
	}

	private WordDicaryVO toVO(WordDicary entity) {
		WordDicaryVO vo = new WordDicaryVO();
		vo.setWordId(entity.getWordId());
		vo.setWordNm(entity.getWordNm());
		vo.setEngNm(entity.getEngNm());
		vo.setWordDc(entity.getWordDc());
		vo.setSynonm(entity.getSynonm());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		if (entity.getFrstRegisterPnttm() != null) {
			vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm().toString());
		}
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		if (entity.getLastUpdusrPnttm() != null) {
			vo.setLastUpdusrPnttm(entity.getLastUpdusrPnttm().toString());
		}
		return vo;
	}
}
