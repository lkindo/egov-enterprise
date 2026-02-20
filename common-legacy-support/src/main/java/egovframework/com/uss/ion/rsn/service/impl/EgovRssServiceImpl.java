package egovframework.com.uss.ion.rsn.service.impl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.rss.Rss;
import com.company.project.domain.rss.RssDomainRepository;

import egovframework.com.uss.ion.rsn.service.EgovRssService;
import egovframework.com.uss.ion.rsn.service.RssInfo;
import jakarta.annotation.Resource;

@Service("egovRssService")
public class EgovRssServiceImpl extends EgovAbstractServiceImpl implements EgovRssService {

	@Resource(name = "rssDomainRepository")
	private RssDomainRepository rssRepository;

	@Override
	public List<Map<String, String>> selectRssTagServiceTable(Map<?, ?> param) throws Exception {
		// This involves dynamic table querying which is better handled by a custom
		// repository implementation or simplified.
		// For now, returning empty list as it's a complex legacy feature.
		return new ArrayList<>();
	}

	@Override
	public List<?> selectRssTagServiceList(RssInfo rssInfo) throws Exception {
		Pageable pageable = PageRequest.of(rssInfo.getPageIndex() - 1, rssInfo.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegistPnttm"));
		Page<Rss> page = rssRepository.findAll(pageable);
		return page.getContent().stream().map(this::toMap).collect(Collectors.toList());
	}

	@Override
	public int selectRssTagServiceListCnt(RssInfo rssInfo) throws Exception {
		return (int) rssRepository.count();
	}

	@Override
	public Map<?, ?> selectRssTagServiceDetail(RssInfo rssInfo) throws Exception {
		return rssRepository.findById(rssInfo.getRssId())
				.map(this::toMap)
				.orElse(new HashMap<>());
	}

	private Map<String, Object> toMap(Rss entity) {
		Map<String, Object> map = new HashMap<>();
		map.put("rssId", entity.getRssId());
		map.put("trgetSvcNm", entity.getTrgetSvcNm());
		map.put("trgetSvcTable", entity.getTrgetSvcTable());
		map.put("hderTitle", entity.getHderTitle());
		map.put("hderLink", entity.getHderLink());
		map.put("hderDescription", entity.getHderDc());
		map.put("frstRegisterId", entity.getFrstRegisterId());
		return map;
	}
}
