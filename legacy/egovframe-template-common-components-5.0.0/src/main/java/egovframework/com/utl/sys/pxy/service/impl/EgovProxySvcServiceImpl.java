package egovframework.com.utl.sys.pxy.service.impl;

import java.io.File;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.utl.sys.pxy.service.EgovProxySvcService;
import egovframework.com.utl.sys.pxy.service.ProxyCommand;
import egovframework.com.utl.sys.pxy.service.ProxyLog;
import egovframework.com.utl.sys.pxy.service.ProxyLogVO;
import egovframework.com.utl.sys.pxy.service.ProxyServer;
import egovframework.com.utl.sys.pxy.service.ProxySvc;
import egovframework.com.utl.sys.pxy.service.ProxySvcVO;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * - ?꾨줉?쒖꽌鍮꾩뒪?뺣낫?????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?꾨줉?쒖꽌鍮꾩뒪?뺣낫??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?꾨줉?쒖꽌鍮꾩뒪?뺣낫??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:27
 */
@Service("egovProxySvcService")
public class EgovProxySvcServiceImpl extends EgovAbstractServiceImpl implements EgovProxySvcService {

	// ?뚯씪援щ텇??
    static final char FILE_SEPARATOR = File.separatorChar;

    /** ID Generation */
    @Resource(name = "egovProxyLogIdGnrService")

    private EgovIdGnrService egovProxyLogIdGnrService;

    @Resource(name = "proxySvcDAO")
    private ProxySvcDAO proxySvcDAO;

    /**
     * ?꾨줉?쒖꽌鍮꾩뒪瑜?愿由ы븯湲??꾪빐 ?깅줉???꾨줉?쒖젙蹂?紐⑸줉??議고쉶?쒕떎.
     *
     * @param proxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 Vo
     * @return List - ?꾨줉?쒖꽌鍮꾩뒪 紐⑸줉
     */
    @Override
    public List<ProxySvcVO> selectProxySvcList(ProxySvcVO proxySvcVO) throws Exception {
        return proxySvcDAO.selectProxySvcList(proxySvcVO);
    }

    /**
     * ?꾨줉?쒖꽌鍮꾩뒪 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
     *
     * @param proxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 Vo
     * @return int - ?꾨줉?쒖꽌鍮꾩뒪 移댁슫????
     */
    @Override
    public int selectProxySvcListTotCnt(ProxySvcVO proxySvcVO) throws Exception {
        return proxySvcDAO.selectProxySvcListTotCnt(proxySvcVO);
    }

    /**
     * ?깅줉???꾨줉?쒖꽌鍮꾩뒪???곸꽭?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param proxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 Vo
     * @return proxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 Vo
     */
    @Override
    public ProxySvcVO selectProxySvc(ProxySvcVO proxySvcVO) throws Exception {
        return proxySvcDAO.selectProxySvc(proxySvcVO);
    }

    /**
     * ?꾨줉?쒖꽌鍮꾩뒪瑜??좉퇋濡??깅줉?쒕떎.
     *
     * @param ProxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 VO
     * @param proxySvc   - ?꾨줉?쒖꽌鍮꾩뒪 model
     * @return proxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 Vo
     */
    @Override
    public ProxySvcVO insertProxySvc(ProxySvcVO proxySvcVO, ProxySvc proxySvc) throws Exception {
        proxySvcDAO.insertProxySvc(proxySvc);
        proxySvcVO.setProxyId(proxySvc.getProxyId());

        if ("01".equals(proxySvc.getSvcSttus())) {// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
            proxySvcVO.setStrPreSvcSttus("02");
            runProxyServer(proxySvcVO, proxySvc);
        }

        return proxySvcDAO.selectProxySvc(proxySvcVO);
    }

    /**
     * 湲??깅줉???꾨줉?쒖꽌鍮꾩뒪瑜??섏젙?쒕떎.
     *
     * @param proxySvc - ?꾨줉?쒖꽌鍮꾩뒪 model
     */
    @Override
    public void updateProxySvc(ProxySvcVO proxySvcVO, ProxySvc proxySvc) throws Exception {
        proxySvcDAO.updateProxySvc(proxySvc);
        runProxyServer(proxySvcVO, proxySvc);
    }

    /**
     * 湲??깅줉???꾨줉?쒖꽌鍮꾩뒪瑜???젣?쒕떎.
     *
     * @param proxySvc - ?꾨줉?쒖꽌鍮꾩뒪 model
     */
    @Override
    public void deleteProxySvc(ProxySvc proxySvc) throws Exception {
        proxySvcDAO.deleteProxySvc(proxySvc);
    }

    /**
     * ?꾨줉?쒖꽌鍮꾩뒪瑜?紐⑤땲?곕쭅?섍린 ?꾪빐 ?깅줉???꾨줉?쒕줈洹?紐⑸줉??議고쉶?쒕떎.
     *
     * @param proxyLogVO - ?꾨줉?쒕줈洹?Vo
     * @return List - ?꾨줉?쒕줈洹?紐⑸줉
     */
    @Override
    public List<ProxyLogVO> selectProxyLogList(ProxyLogVO proxyLogVO) throws Exception {
        return proxySvcDAO.selectProxyLogList(proxyLogVO);
    }

    /**
     * ?꾨줉?쒕줈洹?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
     *
     * @param proxyLogVO - ?꾨줉?쒕줈洹?Vo
     * @return int - ?꾨줉?쒕줈洹?移댁슫????
     */
    @Override
    public int selectProxyLogListTotCnt(ProxyLogVO proxyLogVO) throws Exception {
        return proxySvcDAO.selectProxyLogListTotCnt(proxyLogVO);
    }

    /**
     * ?꾨줉?쒕줈洹몃? ?앹꽦?쒕떎.
     *
     * @param proxyLog - ?꾨줉?쒕줈洹?model
     */
    @Override
    public void insertProxyLog(ProxyLog proxyLog) throws Exception {
        proxySvcDAO.insertProxyLog(proxyLog);
    }

    /**
     * ?꾨줉?쒖꽌踰꾨? ?ㅽ뻾?쒕떎.
     *
     * @param proxySvc - ?꾨줉?쒖꽌鍮꾩뒪 model
     */
    @Override
    public void runProxyServer(ProxySvcVO proxySvcVO, ProxySvc proxySvc) throws Exception {
        // KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
        if (!"01".equals(proxySvcVO.getStrPreSvcSttus()) && "01".equals(proxySvc.getSvcSttus())) {
            ProxyServer proxyServer = new ProxyServer(proxySvc.getSvcIp(), proxySvc.getProxyIp(), Integer.parseInt(proxySvc.getProxyPort()), Integer.parseInt(proxySvc.getSvcPort()), proxySvc.getProxyId(), proxySvcDAO, egovProxyLogIdGnrService);
            proxyServer.start();
        } else if ("01".equals(proxySvcVO.getStrPreSvcSttus()) && !"01".equals(proxySvc.getSvcSttus())) {
            ProxyCommand proxyCommand = new ProxyCommand(proxySvc.getProxyIp(), Integer.parseInt(proxySvc.getProxyPort()));
            proxyCommand.runCommand("stop");
        }
    }

}
