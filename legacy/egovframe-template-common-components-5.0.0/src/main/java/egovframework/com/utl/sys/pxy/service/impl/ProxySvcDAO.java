package egovframework.com.utl.sys.pxy.service.impl;
import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.utl.sys.pxy.service.ProxyLog;
import egovframework.com.utl.sys.pxy.service.ProxyLogVO;
import egovframework.com.utl.sys.pxy.service.ProxySvc;
import egovframework.com.utl.sys.pxy.service.ProxySvcVO;

/**
 * 媛쒖슂
 * - ?꾨줉?쒖꽌鍮꾩뒪?뺣낫 諛??꾨줉?쒕줈洹몄젙蹂댁뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?꾨줉?쒖꽌鍮꾩뒪?뺣낫 諛??꾨줉?쒕줈洹몄젙蹂댁뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?꾨줉?쒖꽌鍮꾩뒪?뺣낫??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:51
 */
@Repository("proxySvcDAO")
public class ProxySvcDAO extends EgovComAbstractDAO {

	/**
     * ?꾨줉?쒖꽌鍮꾩뒪瑜?愿由ы븯湲??꾪빐 ?깅줉???꾨줉?쒖젙蹂?紐⑸줉??議고쉶?쒕떎.
     *
     * @param proxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 Vo
     * @return List - ?꾨줉?쒖꽌鍮꾩뒪 紐⑸줉
     */
    public List<ProxySvcVO> selectProxySvcList(ProxySvcVO proxySvcVO) throws Exception {
        return selectList("proxySvcDAO.selectProxySvcList", proxySvcVO);
    }

    /**
     * ?꾨줉?쒖꽌鍮꾩뒪 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
     *
     * @param proxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 Vo
     * @return int - ?꾨줉?쒖꽌鍮꾩뒪 移댁슫????
     */
    public int selectProxySvcListTotCnt(ProxySvcVO proxySvcVO) throws Exception {
        return selectOne("proxySvcDAO.selectProxySvcListTotCnt", proxySvcVO);
    }

    /**
     * ?깅줉???꾨줉?쒖꽌鍮꾩뒪???곸꽭?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param proxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 Vo
     * @return proxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 Vo
     */
    public ProxySvcVO selectProxySvc(ProxySvcVO proxySvcVO) throws Exception {
        return selectOne("proxySvcDAO.selectProxySvc", proxySvcVO);
    }

    /**
     * ?꾨줉?쒖꽌鍮꾩뒪瑜??좉퇋濡??깅줉?쒕떎.
     *
     * @param proxySvc - ?꾨줉?쒖꽌鍮꾩뒪 model
     */
    public int insertProxySvc(ProxySvc proxySvc) throws Exception {
        return insert("proxySvcDAO.insertProxySvc", proxySvc);
    }

    /**
     * 湲??깅줉???꾨줉?쒖꽌鍮꾩뒪瑜??섏젙?쒕떎.
     *
     * @param proxySvc - ?꾨줉?쒖꽌鍮꾩뒪 model
     */
    public int updateProxySvc(ProxySvc proxySvc) throws Exception {
        return update("proxySvcDAO.updateProxySvc", proxySvc);
    }

    /**
     * 湲??깅줉???꾨줉?쒖꽌鍮꾩뒪瑜???젣?쒕떎.
     *
     * @param proxySvc - ?꾨줉?쒖꽌鍮꾩뒪 model
     */
    public int deleteProxySvc(ProxySvc proxySvc) throws Exception {
        return delete("proxySvcDAO.deleteProxySvc", proxySvc);
    }

    /**
     * ?꾨줉?쒖꽌鍮꾩뒪瑜?紐⑤땲?곕쭅?섍린 ?꾪빐 ?깅줉???꾨줉?쒕줈洹?紐⑸줉??議고쉶?쒕떎.
     *
     * @param proxyLogVO - ?꾨줉?쒕줈洹?Vo
     * @return List - ?꾨줉?쒕줈洹?紐⑸줉
     */
    public List<ProxyLogVO> selectProxyLogList(ProxyLogVO proxyLogVO) throws Exception {
        return selectList("proxySvcDAO.selectProxyLogList", proxyLogVO);
    }

    /**
     * ?꾨줉?쒕줈洹?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
     *
     * @param proxyLogVO - ?꾨줉?쒕줈洹?Vo
     * @return int - ?꾨줉?쒕줈洹?移댁슫????
     */
    public int selectProxyLogListTotCnt(ProxyLogVO proxyLogVO) throws Exception {
        return selectOne("proxySvcDAO.selectProxyLogListTotCnt", proxyLogVO);
    }

    /**
     * ?꾨줉?쒕줈洹몃? ?앹꽦?쒕떎.
     *
     * @param proxyLog - ?꾨줉?쒕줈洹?model
     */
    public int insertProxyLog(ProxyLog proxyLog) throws Exception {
        return insert("proxySvcDAO.insertProxyLog", proxyLog);
    }

}