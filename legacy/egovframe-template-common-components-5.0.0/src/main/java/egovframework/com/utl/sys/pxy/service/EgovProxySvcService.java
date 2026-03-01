package egovframework.com.utl.sys.pxy.service;

import java.util.List;

/**
 * 媛쒖슂 - ?꾨줉?쒖꽌鍮꾩뒪?뺣낫?????Service Interface瑜??뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜 - ?꾨줉?쒖꽌鍮꾩뒪?뺣낫??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎. - ?꾨줉?쒖꽌鍮꾩뒪?뺣낫??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?
 * 援щ텇?쒕떎.
 *
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:27
 */
public interface EgovProxySvcService {
	/**
     * ?꾨줉?쒖꽌鍮꾩뒪瑜?愿由ы븯湲??꾪빐 ?깅줉???꾨줉?쒖젙蹂?紐⑸줉??議고쉶?쒕떎.
     *
     * @param proxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 Vo
     * @return List - ?꾨줉?쒖꽌鍮꾩뒪 紐⑸줉
     *
     */
    public List<ProxySvcVO> selectProxySvcList(ProxySvcVO proxySvcVO) throws Exception;

    /**
     * ?꾨줉?쒖꽌鍮꾩뒪 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
     *
     * @param proxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 Vo
     * @return int - ?꾨줉?쒖꽌鍮꾩뒪 移댁슫????
     */
    public int selectProxySvcListTotCnt(ProxySvcVO proxySvcVO) throws Exception;

    /**
     * ?깅줉???꾨줉?쒖꽌鍮꾩뒪???곸꽭?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param proxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 Vo
     * @return proxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 Vo
     */
    public ProxySvcVO selectProxySvc(ProxySvcVO proxySvcVO) throws Exception;

    /**
     * ?꾨줉?쒖꽌鍮꾩뒪瑜??좉퇋濡??깅줉?쒕떎.
     *
     * @param ProxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 VO
     * @param proxySvc   - ?꾨줉?쒖꽌鍮꾩뒪 model
     * @return proxySvcVO - ?꾨줉?쒖꽌鍮꾩뒪 Vo
     */
    public ProxySvcVO insertProxySvc(ProxySvcVO proxySvcVO, ProxySvc proxySvc) throws Exception;

    /**
     * 湲??깅줉???꾨줉?쒖꽌鍮꾩뒪瑜??섏젙?쒕떎.
     *
     * @param proxySvc - ?꾨줉?쒖꽌鍮꾩뒪 model
     */
    public void updateProxySvc(ProxySvcVO proxySvcVO, ProxySvc proxySvc) throws Exception;

    /**
     * 湲??깅줉???꾨줉?쒖꽌鍮꾩뒪瑜???젣?쒕떎.
     *
     * @param proxySvc - ?꾨줉?쒖꽌鍮꾩뒪 model
     */
    public void deleteProxySvc(ProxySvc proxySvc) throws Exception;

    /**
     * ?꾨줉?쒖꽌鍮꾩뒪瑜?紐⑤땲?곕쭅?섍린 ?꾪빐 ?깅줉???꾨줉?쒕줈洹?紐⑸줉??議고쉶?쒕떎.
     *
     * @param proxyLogVO - ?꾨줉?쒕줈洹?Vo
     * @return List - ?꾨줉?쒕줈洹?紐⑸줉
     */
    public List<ProxyLogVO> selectProxyLogList(ProxyLogVO proxyLogVO) throws Exception;

    /**
     * ?꾨줉?쒕줈洹?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
     *
     * @param proxyLogVO - ?꾨줉?쒕줈洹?Vo
     * @return int - ?꾨줉?쒖꽌鍮꾩뒪 移댁슫????
     */
    public int selectProxyLogListTotCnt(ProxyLogVO proxyLogVO) throws Exception;

    /**
     * ?꾨줉?쒕줈洹몃? ?앹꽦?쒕떎.
     *
     * @param proxyLog - ?꾨줉?쒕줈洹?model
     */
    public void insertProxyLog(ProxyLog proxyLog) throws Exception;

    /**
     * ?꾨줉?쒖꽌踰꾨? ?ㅽ뻾?쒕떎.
     *
     * @param proxySvc - ?꾨줉?쒖꽌鍮꾩뒪 model
     */
    public void runProxyServer(ProxySvcVO proxySvcVO, ProxySvc proxySvc) throws Exception;

}
