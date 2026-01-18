package egovframework.com.uss.ion.nws.service.impl;

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

import com.company.project.domain.news.News;
import com.company.project.domain.news.NewsDomainRepository;

import egovframework.com.uss.ion.nws.service.EgovNewsService;
import egovframework.com.uss.ion.nws.service.NewsVO;
import jakarta.annotation.Resource;

@Service("egovNewsService")
public class EgovNewsServiceImpl extends EgovAbstractServiceImpl implements EgovNewsService {

	@Resource(name = "newsDomainRepository")
	private NewsDomainRepository newsRepository;

	@Resource(name = "egovNewsManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public NewsVO selectNewsDetail(NewsVO searchVO) throws Exception {
		return newsRepository.findById(searchVO.getNewsId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public List<NewsVO> selectNewsList(NewsVO searchVO) {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<News> page = newsRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectNewsListCnt(NewsVO searchVO) {
		return (int) newsRepository.count();
	}

	@Override
	public void insertNews(NewsVO searchVO) throws FdlException {
		try {
			String id = idgenService.getNextStringId();
			searchVO.setNewsId(id);

			News entity = News.builder()
					.newsId(id)
					.newsSj(searchVO.getNewsSj())
					.newsCn(searchVO.getNewsCn())
					.newsOrigin(searchVO.getNewsOrigin())
					.ntceDe(searchVO.getNtceDe())
					.atchFileId(searchVO.getAtchFileId())
					.frstRegisterId(searchVO.getFrstRegisterId())
					.build();

			newsRepository.save(entity);
		} catch (Exception e) {
			throw new FdlException("error.msg", e);
		}
	}

	@Override
	public void updateNews(NewsVO searchVO) {
		newsRepository.findById(searchVO.getNewsId()).ifPresent(entity -> {
			entity.update(searchVO.getNewsSj(), searchVO.getNewsCn(), searchVO.getNewsOrigin(), searchVO.getNtceDe(),
					searchVO.getAtchFileId(), searchVO.getLastUpdusrId());
			newsRepository.save(entity);
		});
	}

	@Override
	public void deleteNews(NewsVO searchVO) {
		newsRepository.deleteById(searchVO.getNewsId());
	}

	private NewsVO toVO(News entity) {
		NewsVO vo = new NewsVO();
		vo.setNewsId(entity.getNewsId());
		vo.setNewsSj(entity.getNewsSj());
		vo.setNewsCn(entity.getNewsCn());
		vo.setNewsOrigin(entity.getNewsOrigin());
		vo.setNtceDe(entity.getNtceDe());
		vo.setAtchFileId(entity.getAtchFileId());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		if (entity.getFrstRegisterPnttm() != null) {
			vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm().toString());
		}
		return vo;
	}
}
