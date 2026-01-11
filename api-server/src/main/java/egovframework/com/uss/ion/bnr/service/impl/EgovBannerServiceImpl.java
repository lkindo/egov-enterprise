package egovframework.com.uss.ion.bnr.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.banner.BannerRepository;

import egovframework.com.uss.ion.bnr.service.Banner;
import egovframework.com.uss.ion.bnr.service.BannerVO;
import egovframework.com.uss.ion.bnr.service.EgovBannerService;
import jakarta.annotation.Resource;

@Service("egovBannerService")
public class EgovBannerServiceImpl extends EgovAbstractServiceImpl implements EgovBannerService {

	@Resource(name = "bannerRepository")
	private BannerRepository bannerRepository;

	@Resource(name = "egovBannerIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<BannerVO> selectBannerList(BannerVO bannerVO) throws Exception {
		Pageable pageable = PageRequest.of(bannerVO.getPageIndex() - 1, bannerVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "regDate"));
		Page<com.company.project.domain.banner.Banner> page = bannerRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectBannerListTotCnt(BannerVO bannerVO) throws Exception {
		return (int) bannerRepository.count();
	}

	@Override
	public BannerVO selectBanner(BannerVO bannerVO) throws Exception {
		return bannerRepository.findById(bannerVO.getBannerId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public BannerVO insertBanner(Banner banner, BannerVO bannerVO) throws Exception {
		String id = idgenService.getNextStringId();
		int sortOrdr = 0;
		try {
			if (banner.getSortOrdr() != null) {
				sortOrdr = Integer.parseInt(banner.getSortOrdr());
			}
		} catch (NumberFormatException e) {
			sortOrdr = 0;
		}

		com.company.project.domain.banner.Banner entity = com.company.project.domain.banner.Banner.builder()
				.bannerId(id)
				.bannerNm(banner.getBannerNm())
				.linkUrl(banner.getLinkUrl())
				.bannerImage(banner.getBannerImage())
				.bannerDc(banner.getBannerDc())
				.sortOrdr(sortOrdr)
				.reflctAt(banner.getReflctAt())
				.userId(banner.getUserId())
				.build();
		bannerRepository.save(entity);
		bannerVO.setBannerId(id);
		return bannerVO;
	}

	@Override
	public void updateBanner(Banner banner) throws Exception {
		bannerRepository.findById(banner.getBannerId()).ifPresent(entity -> {
			int sortOrdr = 0;
			try {
				if (banner.getSortOrdr() != null) {
					sortOrdr = Integer.parseInt(banner.getSortOrdr());
				}
			} catch (NumberFormatException e) {
				sortOrdr = entity.getSortOrdr();
			}
			entity.update(banner.getBannerNm(), banner.getLinkUrl(), banner.getBannerImage(), banner.getBannerDc(),
					sortOrdr, banner.getReflctAt());
			bannerRepository.save(entity);
		});
	}

	@Override
	public void deleteBanner(Banner banner) throws Exception {
		bannerRepository.deleteById(banner.getBannerId());
	}

	@Override
	public void deleteBannerFile(Banner banner) throws Exception {
		bannerRepository.findById(banner.getBannerId()).ifPresent(entity -> {
			entity.update(entity.getBannerNm(), entity.getLinkUrl(), null, entity.getBannerDc(),
					entity.getSortOrdr(), entity.getReflctAt());
			bannerRepository.save(entity);
		});
	}

	@Override
	public List<BannerVO> selectBannerResult(BannerVO bannerVO) throws Exception {
		return bannerRepository.findAll().stream()
				.filter(e -> "Y".equals(e.getReflctAt()))
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	private BannerVO toVO(com.company.project.domain.banner.Banner entity) {
		BannerVO vo = new BannerVO();
		vo.setBannerId(entity.getBannerId());
		vo.setBannerNm(entity.getBannerNm());
		vo.setLinkUrl(entity.getLinkUrl());
		vo.setBannerImage(entity.getBannerImage());
		vo.setBannerDc(entity.getBannerDc());
		vo.setSortOrdr(String.valueOf(entity.getSortOrdr()));
		vo.setReflctAt(entity.getReflctAt());
		vo.setUserId(entity.getUserId());
		if (entity.getRegDate() != null) {
			vo.setRegDate(entity.getRegDate().toString());
		}
		return vo;
	}
}