package egovframework.com.uss.sam.stp.service.impl;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.terms.Terms;
import com.company.project.domain.terms.TermsRepository;

import egovframework.com.uss.sam.stp.service.EgovStplatManageService;
import egovframework.com.uss.sam.stp.service.StplatManageDefaultVO;
import egovframework.com.uss.sam.stp.service.StplatManageVO;
import jakarta.annotation.Resource;

@Service("StplatManageService")
public class EgovStplatManageServiceImpl extends EgovAbstractServiceImpl implements EgovStplatManageService {

	@Resource(name = "termsRepository")
	private TermsRepository termsRepository;

	@Resource(name = "egovStplatManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public StplatManageVO selectStplatDetail(StplatManageVO vo) throws Exception {
		return termsRepository.findById(vo.getUseStplatId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public List<StplatManageVO> selectStplatList(StplatManageDefaultVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "createdDate"));
		Page<Terms> page = termsRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectStplatListTotCnt(StplatManageDefaultVO searchVO) {
		return (int) termsRepository.count();
	}

	@Override
	public void insertStplatCn(StplatManageVO vo) throws Exception {
		egovLogger.debug(vo.toString());
		String useStplatId = idgenService.getNextStringId();
		vo.setUseStplatId(useStplatId);

		Terms entity = Terms.builder()
				.useStplatId(useStplatId)
				.useStplatNm(vo.getUseStplatNm())
				.useStplatCn(vo.getUseStplatCn())
				.infoProvdAgreCn(vo.getInfoProvdAgreCn())
				.frstRegisterId(vo.getFrstRegisterId())
				.build();

		termsRepository.save(entity);
	}

	@Override
	public void updateStplatCn(StplatManageVO vo) throws Exception {
		egovLogger.debug(vo.toString());
		termsRepository.findById(vo.getUseStplatId()).ifPresent(entity -> {
			entity.update(
					vo.getUseStplatNm(),
					vo.getUseStplatCn(),
					vo.getInfoProvdAgreCn(),
					vo.getLastUpdusrId());
			termsRepository.save(entity);
		});
	}

	@Override
	public void deleteStplatCn(StplatManageVO vo) throws Exception {
		egovLogger.debug(vo.toString());
		termsRepository.deleteById(vo.getUseStplatId());
	}

	private StplatManageVO toVO(Terms entity) {
		StplatManageVO vo = new StplatManageVO();
		vo.setUseStplatId(entity.getUseStplatId());
		vo.setUseStplatNm(entity.getUseStplatNm());
		vo.setUseStplatCn(entity.getUseStplatCn());
		vo.setInfoProvdAgreCn(entity.getInfoProvdAgreCn());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		if (entity.getCreatedDate() != null) {
			vo.setFrstRegisterPnttm(entity.getCreatedDate().toString());
		}
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		if (entity.getModifiedDate() != null) {
			vo.setLastUpdusrPnttm(entity.getModifiedDate().toString());
		}
		return vo;
	}
}
