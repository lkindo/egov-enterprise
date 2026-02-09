package egovframework.com.uss.ion.rec.service.impl;

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

import com.company.project.domain.recomendsite.RecomendSite;
import com.company.project.domain.recomendsite.RecomendSiteDomainRepository;

// import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.ion.rec.service.EgovRecomendSiteService;
import egovframework.com.uss.ion.rec.service.RecomendSiteVO;
import jakarta.annotation.Resource;

@Service("egovRecomendSiteService")
public class EgovRecomendSiteServiceImpl extends EgovAbstractServiceImpl implements EgovRecomendSiteService {

	@Resource(name = "recomendSiteDomainRepository")
	private RecomendSiteDomainRepository recomendSiteRepository;

	@Resource(name = "egovRecomendSiteIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public RecomendSiteVO selectRecomendSiteDetail(RecomendSiteVO searchVO) throws Exception {
		return recomendSiteRepository.findById(searchVO.getRecomendSiteId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public List<RecomendSiteVO> selectRecomendSiteList(RecomendSiteVO searchVO) {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "recomendSiteNm"));
		Page<RecomendSite> page = recomendSiteRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectRecomendSiteListCnt(RecomendSiteVO searchVO) {
		return (int) recomendSiteRepository.count();
	}

	@Override
	public void insertRecomendSite(RecomendSiteVO searchVO) throws FdlException {
		try {
			String id = idgenService.getNextStringId();
			searchVO.setRecomendSiteId(id);

			RecomendSite entity = RecomendSite.builder()
					.recomendSiteId(id)
					.recomendSiteUrl(searchVO.getRecomendSiteUrl())
					.recomendSiteNm(searchVO.getRecomendSiteNm())
					.recomendSiteDc(searchVO.getRecomendSiteDc())
					.recomendResnCn(searchVO.getRecomendResnCn())
					.recomendConfmAt(searchVO.getRecomendConfmAt())
					.confmDe(searchVO.getConfmDe())
					.frstRegisterId(searchVO.getFrstRegisterId())
					.build();

			recomendSiteRepository.save(entity);
		} catch (Exception e) {
			throw new FdlException("error.msg", e);
		}
	}

	@Override
	public void updateRecomendSite(RecomendSiteVO searchVO) {
		recomendSiteRepository.findById(searchVO.getRecomendSiteId()).ifPresent(entity -> {
			entity.update(searchVO.getRecomendSiteUrl(), searchVO.getRecomendSiteNm(), searchVO.getRecomendSiteDc(),
					searchVO.getRecomendResnCn(), searchVO.getRecomendConfmAt(), searchVO.getConfmDe(),
					searchVO.getLastUpdusrId());
			recomendSiteRepository.save(entity);
		});
	}

	@Override
	public void deleteRecomendSite(RecomendSiteVO searchVO) {
		recomendSiteRepository.deleteById(searchVO.getRecomendSiteId());
	}

	private RecomendSiteVO toVO(RecomendSite entity) {
		RecomendSiteVO vo = new RecomendSiteVO();
		vo.setRecomendSiteId(entity.getRecomendSiteId());
		vo.setRecomendSiteUrl(entity.getRecomendSiteUrl());
		vo.setRecomendSiteNm(entity.getRecomendSiteNm());
		vo.setRecomendSiteDc(entity.getRecomendSiteDc());
		vo.setRecomendResnCn(entity.getRecomendResnCn());
		vo.setRecomendConfmAt(entity.getRecomendConfmAt());
		vo.setConfmDe(entity.getConfmDe());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		if (entity.getFrstRegisterPnttm() != null) {
			vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm().toString());
		}
		return vo;
	}
}
