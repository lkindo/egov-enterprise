package egovframework.com.uss.ion.sit.service.impl;

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

import com.company.project.domain.notification.Site;
import com.company.project.domain.notification.SiteRepository;

import egovframework.com.uss.ion.sit.service.EgovSiteService;
import egovframework.com.uss.ion.sit.service.SiteVO;
import jakarta.annotation.Resource;

@Service("egovSiteService")
public class EgovSiteServiceImpl extends EgovAbstractServiceImpl implements EgovSiteService {

	@Resource(name = "siteRepository")
	private SiteRepository siteRepository;

	@Resource(name = "egovSiteIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public SiteVO selectSiteDetail(SiteVO searchVO) throws Exception {
		return siteRepository.findById(searchVO.getSiteId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public List<SiteVO> selectSiteList(SiteVO searchVO) {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "siteNm"));
		Page<Site> page = siteRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectSiteListCnt(SiteVO searchVO) {
		return (int) siteRepository.count();
	}

	@Override
	public void insertSite(SiteVO searchVO) throws FdlException {
		try {
			String id = idgenService.getNextStringId();
			searchVO.setSiteId(id);

			Site entity = Site.builder()
					.siteId(id)
					.siteUrl(searchVO.getSiteUrl())
					.siteNm(searchVO.getSiteNm())
					.siteDc(searchVO.getSiteDc())
					.siteThemaClCode(searchVO.getSiteThemaClCode())
					.actvtyAt(searchVO.getActvtyAt())
					.useAt(searchVO.getUseAt())
					.frstRegisterId(searchVO.getFrstRegisterId())
					.build();

			siteRepository.save(entity);
		} catch (Exception e) {
			throw new FdlException("error.msg", e);
		}
	}

	@Override
	public void updateSite(SiteVO searchVO) {
		siteRepository.findById(searchVO.getSiteId()).ifPresent(entity -> {
			entity.update(searchVO.getSiteUrl(), searchVO.getSiteNm(), searchVO.getSiteDc(),
					searchVO.getSiteThemaClCode(), searchVO.getActvtyAt(), searchVO.getUseAt(),
					searchVO.getLastUpdusrId());
			siteRepository.save(entity);
		});
	}

	@Override
	public void deleteSite(SiteVO searchVO) {
		siteRepository.deleteById(searchVO.getSiteId());
	}

	private SiteVO toVO(Site entity) {
		SiteVO vo = new SiteVO();
		vo.setSiteId(entity.getSiteId());
		vo.setSiteUrl(entity.getSiteUrl());
		vo.setSiteNm(entity.getSiteNm());
		vo.setSiteDc(entity.getSiteDc());
		vo.setSiteThemaClCode(entity.getSiteThemaClCode());
		vo.setActvtyAt(entity.getActvtyAt());
		vo.setUseAt(entity.getUseAt());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		return vo;
	}
}
