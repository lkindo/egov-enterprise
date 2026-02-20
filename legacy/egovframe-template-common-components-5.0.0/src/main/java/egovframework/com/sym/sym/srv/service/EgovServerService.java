package egovframework.com.sym.sym.srv.service;

import java.util.List;

/**
 * 媛쒖슂
 * - ?쒕쾭?뺣낫?????Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?쒕쾭?뺣낫??????깅줉, ?섏젙, ??젣, 議고쉶 ?깆쓽 湲곕뒫???쒓났?쒕떎.
 * - ?쒕쾭?뺣낫??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?대Ц以
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:33
 */
public interface EgovServerService {

	/**
	 * ?쒕쾭?λ퉬瑜?愿由ы븯湲??꾪빐 ?깅줉???쒕쾭?λ퉬紐⑸줉??議고쉶?쒕떎.
	 * @param serverEqpmnVO - ?쒕쾭?λ퉬 Vo
	 * @return List - ?쒕쾭?λ퉬 紐⑸줉
	 */
	public List<ServerEqpmnVO> selectServerEqpmnList(ServerEqpmnVO serverEqpmnVO) throws Exception;

	/**
	 * ?쒕쾭?λ퉬紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param serverEqpmnVO - ?쒕쾭?λ퉬 Vo
	 * @return int - ?쒕쾭?λ퉬 移댁슫????
	 */
	public int selectServerEqpmnListTotCnt(ServerEqpmnVO serverEqpmnVO) throws Exception;

	/**
	 * ?깅줉???쒕쾭?λ퉬???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param serverEqpmnVO - ?쒕쾭?λ퉬 Vo
	 * @return serverEqpmnVO - ?쒕쾭?λ퉬 Vo
	 */
	public ServerEqpmnVO selectServerEqpmn(ServerEqpmnVO serverEqpmnVO) throws Exception;

	/**
	 * ?쒕쾭?λ퉬?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param serverEqpmn - ?쒕쾭?λ퉬 model
	 */
	public ServerEqpmnVO insertServerEqpmn(ServerEqpmn serverEqpmn, ServerEqpmnVO serverEqpmnVO) throws Exception;

	/**
	 * 湲??깅줉???쒕쾭?λ퉬?뺣낫瑜??섏젙?쒕떎.
	 * @param serverEqpmn - ?쒕쾭?λ퉬 model
	 */
	public void updateServerEqpmn(ServerEqpmn serverEqpmn) throws Exception;

	/**
	 * 湲??깅줉???쒕쾭?λ퉬?뺣낫瑜???젣?쒕떎.
	 * @param serverEqpmn - ?쒕쾭?λ퉬 model
	 */
	public void deleteServerEqpmn(ServerEqpmn serverEqpmn) throws Exception;

	/**
	 * ?쒕쾭?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???쒕쾭紐⑸줉??議고쉶?쒕떎.
	 * @param serverVO - ?쒕쾭 Vo
	 * @return List - ?쒕쾭 紐⑸줉
	 */
	public List<ServerVO> selectServerList(ServerVO serverVO) throws Exception;

	/**
	 * ?쒕쾭紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param serverVO - ?쒕쾭 Vo
	 * @return int - ?쒕쾭 移댁슫????
	 */
	public int selectServerListTotCnt(ServerVO serverVO) throws Exception;

	/**
	 * ?깅줉???쒕쾭???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param serverVO - ?쒕쾭 Vo
	 * @return serverVO - ?쒕쾭 Vo
	 */
	public ServerVO selectServer(ServerVO serverVO) throws Exception;

	/**
	 * ?깅줉???쒕쾭???곸꽭?뺣낫以??쒕쾭?λ퉬紐⑸줉??議고쉶?쒕떎.
	 * @param serverVO - ?쒕쾭 Vo
	 * @return List - ?쒕쾭?λ퉬 紐⑸줉
	 */
	public List<ServerEqpmnVO> selectServerEqpmnRelateDetail(ServerVO serverVO) throws Exception;
	
	/**
	 * ?쒕쾭???깅줉???쒕쾭?λ퉬紐⑸줉??移댁슫?몃? 議고쉶?쒕떎.
	 * @param serverVO - ?쒕쾭 Vo
	 * @return int - ?쒕쾭???깅줉???쒕쾭?λ퉬 移댁슫????
	 */
	public int selectServerEqpmnRelateDetailTotCnt(ServerVO serverVO) throws Exception;
	
	
	/**
	 * ?쒕쾭?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param server - ?쒕쾭 model
	 */
	public ServerVO insertServer(Server server, ServerVO serverVO) throws Exception;

	/**
	 * 湲??깅줉???쒕쾭?뺣낫瑜??섏젙?쒕떎.
	 * @param server - ?쒕쾭 model
	 */
	public void updateServer(Server server) throws Exception;

	/**
	 * 湲??깅줉???쒕쾭?뺣낫瑜???젣?쒕떎.
	 * @param server - ?쒕쾭 model
	 */
	public void deleteServer(Server server) throws Exception;

	/**
	 * ?쒕쾭?λ퉬愿怨꾩젙蹂대? 愿由ы븯湲??꾪빐 ????쒕쾭?λ퉬愿怨꾨ぉ濡앹쓣 議고쉶?쒕떎.
	 * @param serverEqpmnRelateVO - ?쒕쾭?λ퉬愿怨?Vo
	 * @return List - ?쒕쾭?λ퉬愿怨?紐⑸줉
	 */
	public List<ServerEqpmnRelateVO> selectServerEqpmnRelateList(ServerEqpmnRelateVO serverEqpmnRelateVO) throws Exception;

	/**
	 * ?쒕쾭?λ퉬愿怨????紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param serverEqpmnRelateVO - ?쒕쾭?λ퉬愿怨?Vo
	 * @return int - ?쒕쾭?λ퉬愿怨?移댁슫????
	 */
	public int selectServerEqpmnRelateListTotCnt(ServerEqpmnRelateVO serverEqpmnRelateVO) throws Exception;

	/**
	 * ?쒕쾭?λ퉬愿怨꾩젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param serverEqpmnRelate - ?쒕쾭?λ퉬愿怨?model
	 */
	public void insertServerEqpmnRelate(ServerEqpmnRelate serverEqpmnRelate) throws Exception;

	/**
	 * 湲??깅줉???쒕쾭?λ퉬愿怨꾩젙蹂대? ??젣?쒕떎.
	 * @param serverEqpmnRelate - ?쒕쾭?λ퉬愿怨?model
	 */
	public void deleteServerEqpmnRelate(ServerEqpmnRelate serverEqpmnRelate) throws Exception;

}