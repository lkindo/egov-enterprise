package egovframework.com.uss.olh.awm.service.impl;

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

import com.company.project.domain.help.AdministrationWord;
import com.company.project.domain.help.AdministrationWordRepository;

import egovframework.com.uss.olh.awm.service.AdministrationWordVO;
import egovframework.com.uss.olh.awm.service.EgovAdministrationWordService;
import jakarta.annotation.Resource;

@Service("egovAdministrationWordService")
public class EgovAdministrationWordServiceImpl extends EgovAbstractServiceImpl
		implements EgovAdministrationWordService {

	@Resource(name = "administrationWordRepository")
	private AdministrationWordRepository administrationWordRepository;

	@Resource(name = "egovAdministrationWordIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public AdministrationWordVO selectAdministrationWordDetail(AdministrationWordVO vo) throws Exception {
		return administrationWordRepository.findById(vo.getAdministWordId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public List<AdministrationWordVO> selectAdministrationWordList(AdministrationWordVO searchVO) {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<AdministrationWord> page = administrationWordRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectAdministrationWordListCnt(AdministrationWordVO searchVO) {
		return (int) administrationWordRepository.count();
	}

	@Override
	public void insertAdministrationWord(AdministrationWordVO vo) throws FdlException {
		try {
			String id = idgenService.getNextStringId();
			vo.setAdministWordId(id);

			AdministrationWord entity = AdministrationWord.builder()
					.administWordId(id)
					.administWordNm(vo.getAdministWordNm())
					.administWordEngNm(vo.getAdministWordEngNm())
					.administWordAbrv(vo.getAdministWordAbrv())
					.themaRelm(vo.getThemaRelm())
					.wordDomn(vo.getWordDomn())
					.stdWord(vo.getStdWord())
					.administWordDf(vo.getAdministWordDf())
					.administWordDc(vo.getAdministWordDc())
					.frstRegisterId(vo.getFrstRegisterId())
					.build();

			administrationWordRepository.save(entity);
		} catch (Exception e) {
			throw new FdlException("error.msg", e);
		}
	}

	@Override
	public void updateAdministrationWord(AdministrationWordVO vo) {
		administrationWordRepository.findById(vo.getAdministWordId()).ifPresent(entity -> {
			entity.update(
					vo.getAdministWordNm(),
					vo.getAdministWordEngNm(),
					vo.getAdministWordAbrv(),
					vo.getThemaRelm(),
					vo.getWordDomn(),
					vo.getStdWord(),
					vo.getAdministWordDf(),
					vo.getAdministWordDc(),
					vo.getLastUpdusrId());
			administrationWordRepository.save(entity);
		});
	}

	@Override
	public void deleteAdministrationWord(AdministrationWordVO vo) {
		administrationWordRepository.deleteById(vo.getAdministWordId());
	}

	private AdministrationWordVO toVO(AdministrationWord entity) {
		AdministrationWordVO vo = new AdministrationWordVO();
		vo.setAdministWordId(entity.getAdministWordId());
		vo.setAdministWordNm(entity.getAdministWordNm());
		vo.setAdministWordEngNm(entity.getAdministWordEngNm());
		vo.setAdministWordAbrv(entity.getAdministWordAbrv());
		vo.setThemaRelm(entity.getThemaRelm());
		vo.setWordDomn(entity.getWordDomn());
		vo.setStdWord(entity.getStdWord());
		vo.setAdministWordDf(entity.getAdministWordDf());
		vo.setAdministWordDc(entity.getAdministWordDc());
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
