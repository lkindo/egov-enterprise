package egovframework.com.uss.ion.rss.service.impl;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.notification.RssTag;
import com.company.project.domain.notification.RssTagRepository;

import egovframework.com.uss.ion.rss.service.EgovRssTagManageService;
import egovframework.com.uss.ion.rss.service.RssManage;
import jakarta.annotation.Resource;

@Service("egovRssTagManageService")
public class EgovRssTagManageServiceImpl extends EgovAbstractServiceImpl implements EgovRssTagManageService {

    @Resource(name = "notificationRssTagRepository")
    private RssTagRepository rssTagRepository;

    @Resource(name = "egovRssManageIdGnrService")
    private EgovIdGnrService idgenService;

    @Override
    public List<RssManage> selectRssTagManageList(RssManage searchVO) throws Exception {
        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
                Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
        Page<RssTag> page = rssTagRepository.findAll(pageable);
        return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
    }

    @Override
    public int selectRssTagManageListCnt(RssManage searchVO) throws Exception {
        return (int) rssTagRepository.count();
    }

    @Override
    public RssManage selectRssTagManageDetail(RssManage searchVO) throws Exception {
        return rssTagRepository.findById(searchVO.getRssId())
                .map(this::toVO)
                .orElseThrow(() -> processException("info.nodata.msg"));
    }

    @Override
    public void insertRssTagManage(RssManage searchVO) throws Exception {
        String id = idgenService.getNextStringId();
        searchVO.setRssId(id);

        RssTag entity = RssTag.builder()
                .rssId(id)
                .trgetSvcNm(searchVO.getTrgetSvcNm())
                .trgetSvcTable(searchVO.getTrgetSvcTable())
                .trgetSvcListCo(searchVO.getTrgetSvcListCo())
                .hderTag(searchVO.getHderTag())
                .itemTag(searchVO.getBdtTag()) // Mapping to BdtTag in VO
                .titleTag(searchVO.getBdtTitle()) // Mapping to BdtTitle in VO
                .linkTag(searchVO.getBdtLink()) // Mapping to BdtLink in VO
                .descriptionTag(searchVO.getBdtDescription()) // Mapping to BdtDescription in VO
                .frstRegisterId(searchVO.getFrstRegisterId())
                .build();

        rssTagRepository.save(entity);
    }

    @Override
    public void updateRssTagManage(RssManage searchVO) throws Exception {
        rssTagRepository.findById(searchVO.getRssId()).ifPresent(entity -> {
            entity.update(searchVO.getTrgetSvcNm(), searchVO.getTrgetSvcTable(), searchVO.getTrgetSvcListCo(),
                    searchVO.getHderTag(), searchVO.getBdtTag(), searchVO.getBdtTitle(), searchVO.getBdtLink(),
                    searchVO.getBdtDescription(), searchVO.getLastUpdusrId());
            rssTagRepository.save(entity);
        });
    }

    @Override
    public void deleteRssTagManage(RssManage searchVO) throws Exception {
        rssTagRepository.deleteById(searchVO.getRssId());
    }

    @Override
    public List<?> selectRssTagManageTableList() throws Exception {
        return List.of();
    }

    @Override
    public List<?> selectRssTagManageTableColumnList(Map<?, ?> map) throws Exception {
        return List.of();
    }

    private RssManage toVO(RssTag entity) {
        RssManage vo = new RssManage();
        vo.setRssId(entity.getRssId());
        vo.setTrgetSvcNm(entity.getTrgetSvcNm());
        vo.setTrgetSvcTable(entity.getTrgetSvcTable());
        vo.setTrgetSvcListCo(entity.getTrgetSvcListCo());
        vo.setHderTag(entity.getHderTag());
        vo.setBdtTag(entity.getItemTag());
        vo.setBdtTitle(entity.getTitleTag());
        vo.setBdtLink(entity.getLinkTag());
        vo.setBdtDescription(entity.getDescriptionTag());
        vo.setFrstRegisterId(entity.getFrstRegisterId());
        return vo;
    }
}
