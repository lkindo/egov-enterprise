package egovframework.com.utl.sys.pxy.service.impl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.monitoring.ProxyLogRepository;
import com.company.project.domain.monitoring.ProxySvc;
import com.company.project.domain.monitoring.ProxySvcRepository;

import egovframework.com.utl.sys.pxy.service.EgovProxySvcService;
import egovframework.com.utl.sys.pxy.service.ProxyCommand;
import egovframework.com.utl.sys.pxy.service.ProxyLog;
import egovframework.com.utl.sys.pxy.service.ProxyLogVO;
import egovframework.com.utl.sys.pxy.service.ProxyServer;
import egovframework.com.utl.sys.pxy.service.ProxySvcVO;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;

/**
 * ??
 * - ?????????????ServiceImpl ?????? ???.
 *
 * ???
 * - ??????????????, ??, ???? ?????????.
 * - ???????????? ?, ??????.
 * 
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?? 10:44:27
 **/
@Service("egovProxySvcService")
@RequiredArgsConstructor
public class EgovProxySvcServiceImpl extends EgovAbstractServiceImpl implements EgovProxySvcService {

    private final ProxySvcRepository proxySvcRepository;
    private final ProxyLogRepository proxyLogRepository;

    /** ID Generation **/
    @Resource(name = "egovProxyLogIdGnrService")
    private EgovIdGnrService egovProxyLogIdGnrService;

    /**
     * ??????????? ????????????.
     *
     * @param proxySvcVO - ???????Vo
     * @return List - ????????
     **/
    @Override
    public List<ProxySvcVO> selectProxySvcList(ProxySvcVO proxySvcVO) throws Exception {
        Pageable pageable = PageRequest.of(proxySvcVO.getFirstIndex() / proxySvcVO.getRecordCountPerPage(),
                proxySvcVO.getRecordCountPerPage());
        Page<Object[]> page = proxySvcRepository.selectProxySvcList(proxySvcVO.getStrProxyNm(), pageable);
        return page.getContent().stream().map(this::mapToSvcVO).collect(Collectors.toList());
    }

    /**
     * ???????????????.
     *
     * @param proxySvcVO - ???????Vo
     * @return int - ????????????
     **/
    @Override
    public int selectProxySvcListTotCnt(ProxySvcVO proxySvcVO) throws Exception {
        Pageable pageable = PageRequest.of(0, 1);
        Page<Object[]> page = proxySvcRepository.selectProxySvcList(proxySvcVO.getStrProxyNm(), pageable);
        return (int) page.getTotalElements();
    }

    /**
     * ??????????????????.
     *
     * @param proxySvcVO - ???????Vo
     * @return proxySvcVO - ???????Vo
     **/
    @Override
    public ProxySvcVO selectProxySvc(ProxySvcVO proxySvcVO) throws Exception {
        return proxySvcRepository.findById(proxySvcVO.getProxyId())
                .map(this::mapToSvcVO)
                .orElse(null);
    }

    /**
     * ????????????.
     *
     * @param ProxySvcVO - ???????VO
     * @param proxySvc   - ???????model
     * @return proxySvcVO - ???????Vo
     **/
    @Override
    @Transactional
    public ProxySvcVO insertProxySvc(ProxySvcVO proxySvcVO, egovframework.com.utl.sys.pxy.service.ProxySvc proxySvc)
            throws Exception {
        ProxySvc entity = ProxySvc.builder()
                .proxyId(proxySvc.getProxyId())
                .proxyNm(proxySvc.getProxyNm())
                .proxyIp(proxySvc.getProxyIp())
                .proxyPort(proxySvc.getProxyPort())
                .trgetSvcNm(proxySvc.getTrgetSvcNm())
                .svcDc(proxySvc.getSvcDc())
                .svcIp(proxySvc.getSvcIp())
                .svcPort(proxySvc.getSvcPort())
                .svcSttus(proxySvc.getSvcSttus())
                .frstRegisterId(proxySvc.getFrstRegisterId())
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(proxySvc.getLastUpdusrId())
                .lastUpdusrPnttm(LocalDateTime.now())
                .build();
        proxySvcRepository.save(entity);
        proxySvcVO.setProxyId(entity.getProxyId());

        if ("01".equals(proxySvc.getSvcSttus())) {
            proxySvcVO.setStrPreSvcSttus("02");
            runProxyServer(proxySvcVO, proxySvc);
        }

        return selectProxySvc(proxySvcVO);
    }

    /**
     * ???????????????.
     *
     * @param proxySvc - ???????model
     **/
    @Override
    @Transactional
    public void updateProxySvc(ProxySvcVO proxySvcVO, egovframework.com.utl.sys.pxy.service.ProxySvc proxySvc)
            throws Exception {
        proxySvcRepository.findById(proxySvc.getProxyId()).ifPresent(entity -> {
            ProxySvc updated = ProxySvc.builder()
                    .proxyId(entity.getProxyId())
                    .proxyNm(proxySvc.getProxyNm())
                    .proxyIp(proxySvc.getProxyIp())
                    .proxyPort(proxySvc.getProxyPort())
                    .trgetSvcNm(proxySvc.getTrgetSvcNm())
                    .svcDc(proxySvc.getSvcDc())
                    .svcIp(proxySvc.getSvcIp())
                    .svcPort(proxySvc.getSvcPort())
                    .svcSttus(proxySvc.getSvcSttus())
                    .frstRegisterId(entity.getFrstRegisterId())
                    .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                    .lastUpdusrId(proxySvc.getLastUpdusrId())
                    .lastUpdusrPnttm(LocalDateTime.now())
                    .build();
            proxySvcRepository.save(updated);
        });
        runProxyServer(proxySvcVO, proxySvc);
    }

    /**
     * ????????????????.
     *
     * @param proxySvc - ???????model
     **/
    @Override
    @Transactional
    public void deleteProxySvc(egovframework.com.utl.sys.pxy.service.ProxySvc proxySvc) throws Exception {
        proxySvcRepository.deleteById(proxySvc.getProxyId());
    }

    /**
     * ??????????? ? ????????????.
     *
     * @param proxyLogVO - ????Vo
     * @return List - ?????
     **/
    @Override
    public List<ProxyLogVO> selectProxyLogList(ProxyLogVO proxyLogVO) throws Exception {
        Pageable pageable = PageRequest.of(proxyLogVO.getFirstIndex() / proxyLogVO.getRecordCountPerPage(),
                proxyLogVO.getRecordCountPerPage());
        Page<Object[]> page = proxyLogRepository.selectProxyLogList(proxyLogVO.getStrStartDate(),
                proxyLogVO.getStrEndDate(), pageable);
        return page.getContent().stream().map(this::mapToLogVO).collect(Collectors.toList());
    }

    /**
     * ????????????.
     *
     * @param proxyLogVO - ????Vo
     * @return int - ?????????
     **/
    @Override
    public int selectProxyLogListTotCnt(ProxyLogVO proxyLogVO) throws Exception {
        Pageable pageable = PageRequest.of(0, 1);
        Page<Object[]> page = proxyLogRepository.selectProxyLogList(proxyLogVO.getStrStartDate(),
                proxyLogVO.getStrEndDate(), pageable);
        return (int) page.getTotalElements();
    }

    /**
     * ???? ????.
     *
     * @param proxyLog - ????model
     **/
    @Override
    @Transactional
    public void insertProxyLog(ProxyLog proxyLog) throws Exception {
        com.company.project.domain.monitoring.ProxyLog entity = com.company.project.domain.monitoring.ProxyLog.builder()
                .logId(proxyLog.getLogId())
                .proxyId(proxyLog.getProxyId())
                .clntIp(proxyLog.getClntIp())
                .clntPort(proxyLog.getClntPort())
                .conectTime(LocalDateTime.now())
                .frstRegisterId(proxyLog.getFrstRegisterId())
                .frstRegisterPnttm(LocalDateTime.now())
                .lastUpdusrId(proxyLog.getLastUpdusrId())
                .lastUpdusrPnttm(LocalDateTime.now())
                .build();
        proxyLogRepository.save(entity);
    }

    /**
     * ???? ????.
     *
     * @param proxySvc - ???????model
     **/
    @Override
    public void runProxyServer(ProxySvcVO proxySvcVO, egovframework.com.utl.sys.pxy.service.ProxySvc proxySvc)
            throws Exception {
        if (!"01".equals(proxySvcVO.getStrPreSvcSttus()) && "01".equals(proxySvc.getSvcSttus())) {
            ProxyServer proxyServer = new ProxyServer(proxySvc.getSvcIp(), proxySvc.getProxyIp(),
                    Integer.parseInt(proxySvc.getProxyPort()), Integer.parseInt(proxySvc.getSvcPort()),
                    proxySvc.getProxyId(), proxyLogRepository, egovProxyLogIdGnrService);
            proxyServer.start();
        } else if ("01".equals(proxySvcVO.getStrPreSvcSttus()) && !"01".equals(proxySvc.getSvcSttus())) {
            ProxyCommand proxyCommand = new ProxyCommand(proxySvc.getProxyIp(),
                    Integer.parseInt(proxySvc.getProxyPort()));
            proxyCommand.runCommand("stop");
        }
    }

    private ProxySvcVO mapToSvcVO(ProxySvc entity) {
        ProxySvcVO vo = new ProxySvcVO();
        vo.setProxyId(entity.getProxyId());
        vo.setProxyNm(entity.getProxyNm());
        vo.setProxyIp(entity.getProxyIp());
        vo.setProxyPort(entity.getProxyPort());
        vo.setTrgetSvcNm(entity.getTrgetSvcNm());
        vo.setSvcDc(entity.getSvcDc());
        vo.setSvcIp(entity.getSvcIp());
        vo.setSvcPort(entity.getSvcPort());
        vo.setSvcSttus(entity.getSvcSttus());
        vo.setFrstRegisterPnttm(
                entity.getFrstRegisterPnttm() != null ? entity.getFrstRegisterPnttm().toString() : null);
        vo.setFrstRegisterId(entity.getFrstRegisterId());
        vo.setLastUpdusrPnttm(entity.getLastUpdusrPnttm() != null ? entity.getLastUpdusrPnttm().toString() : null);
        vo.setLastUpdusrId(entity.getLastUpdusrId());
        return vo;
    }

    private ProxySvcVO mapToSvcVO(Object[] row) {
        ProxySvcVO vo = new ProxySvcVO();
        vo.setProxyId((String) row[0]);
        vo.setProxyNm((String) row[1]);
        vo.setProxyIp((String) row[2]);
        vo.setProxyPort((String) row[3]);
        vo.setTrgetSvcNm((String) row[4]);
        vo.setSvcDc((String) row[5]);
        vo.setSvcIp((String) row[6]);
        vo.setSvcPort((String) row[7]);
        vo.setSvcSttus((String) row[8]);
        vo.setSvcSttusNm((String) row[9]);
        vo.setFrstRegisterPnttm(row[10] != null ? row[10].toString() : null);
        vo.setFrstRegisterId((String) row[11]);
        vo.setLastUpdusrPnttm(row[12] != null ? row[12].toString() : null);
        vo.setLastUpdusrId((String) row[13]);
        return vo;
    }

    private ProxyLogVO mapToLogVO(Object[] row) {
        ProxyLogVO vo = new ProxyLogVO();
        vo.setProxyId((String) row[0]);
        vo.setLogId((String) row[1]);
        vo.setProxyNm((String) row[2]);
        vo.setClntPort((String) row[3]);
        vo.setClntIp((String) row[4]);
        vo.setConectTime(row[5] != null ? row[5].toString() : null);
        vo.setFrstRegisterPnttm(row[6] != null ? row[6].toString() : null);
        vo.setFrstRegisterId((String) row[7]);
        vo.setLastUpdusrPnttm(row[8] != null ? row[8].toString() : null);
        vo.setLastUpdusrId((String) row[9]);
        return vo;
    }
}
