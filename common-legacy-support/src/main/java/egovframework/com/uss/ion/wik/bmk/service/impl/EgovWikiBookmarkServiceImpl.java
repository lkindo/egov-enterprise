package egovframework.com.uss.ion.wik.bmk.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.wiki.WikiBookmarkRepository;

import egovframework.com.uss.ion.wik.bmk.service.EgovWikiBookmarkService;
import egovframework.com.uss.ion.wik.bmk.service.WikiBookmark;
import jakarta.annotation.Resource;

@Service("egovWikiBookmarkService")
public class EgovWikiBookmarkServiceImpl extends EgovAbstractServiceImpl implements EgovWikiBookmarkService {

	@Resource(name = "wikiBookmarkDomainRepository")
	private WikiBookmarkRepository wikiBookmarkRepository;

	@Resource(name = "egovWikiBookmarkIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<?> selectWikiBookmarkList(WikiBookmark wikiBookmark) throws Exception {
		Pageable pageable = PageRequest.of(wikiBookmark.getPageIndex() - 1, wikiBookmark.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegistPnttm"));
		Page<com.company.project.domain.wiki.WikiBookmark> page = wikiBookmarkRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectWikiBookmarkListCnt(WikiBookmark wikiBookmark) throws Exception {
		return (int) wikiBookmarkRepository.count();
	}

	@Override
	public int selectWikiBookmarkDuplicationCnt(WikiBookmark wikiBookmark) throws Exception {
		return 0;
	}

	@Override
	public void insertWikiBookmark(WikiBookmark wikiBookmark) throws Exception {
		String id = idgenService.getNextStringId();
		com.company.project.domain.wiki.WikiBookmark entity = com.company.project.domain.wiki.WikiBookmark
				.builder()
				.wikiBkmkId(id)
				.wikiBkmkNm(wikiBookmark.getWikiBkmkNm())
				.userId(wikiBookmark.getUsid())
				.frstRegisterId(wikiBookmark.getFrstRegisterId())
				.build();
		wikiBookmarkRepository.save(entity);
	}

	@Override
	public void deleteWikiBookmark(WikiBookmark wikiBookmark) throws Exception {
		wikiBookmarkRepository.deleteById(wikiBookmark.getWikiBkmkId());
	}

	private WikiBookmark toVO(com.company.project.domain.wiki.WikiBookmark entity) {
		WikiBookmark vo = new WikiBookmark();
		vo.setWikiBkmkId(entity.getWikiBkmkId());
		vo.setWikiBkmkNm(entity.getWikiBkmkNm());
		vo.setUsid(entity.getUserId());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		if (entity.getFrstRegistPnttm() != null) {
			vo.setFrstRegisterPnttm(entity.getFrstRegistPnttm().toString());
		}
		return vo;
	}
}
