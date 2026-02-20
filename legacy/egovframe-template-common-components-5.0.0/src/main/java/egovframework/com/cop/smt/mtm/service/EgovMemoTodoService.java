package egovframework.com.cop.smt.mtm.service;

import java.util.List;
import java.util.Map;

/**
 * 媛쒖슂
 * - 硫붾え?좎씪?????Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 硫붾え?좎씪??????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - 硫붾え?좎씪??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶, ?ㅻ뒛???좎씪議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 19-7-2010 ?ㅼ쟾 10:12:46
 *   <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.7.19	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovMemoTodoService {

	/**
	 * 硫붾え?좎씪 紐⑸줉??議고쉶?쒕떎.
	 * @param MemoTodoVO - 硫붾え?좎씪 VO
	 * @return  Map<String, Object> - 硫붾え?좎씪 List
	 * 
	 * @param memoTodoVO
	 */
	public Map<String, Object> selectMemoTodoList(MemoTodoVO memoTodoVO) throws Exception;

	/**
	 * 硫붾え?좎씪 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param MemoTodoVO - 硫붾え?좎씪 VO
	 * @return  MemoTodoVO - 硫붾え?좎씪 VO
	 * 
	 * @param memoTodoVO
	 */
	public MemoTodoVO selectMemoTodo(MemoTodoVO memoTodoVO) throws Exception;

	/**
	 * 硫붾え?좎씪 ?뺣낫瑜??섏젙?쒕떎.
	 * @param MemoTodo - 硫붾え?좎씪 model
	 * 
	 * @param memoTodo
	 */
	public void updateMemoTodo(MemoTodo memoTodo) throws Exception;

	/**
	 * 硫붾え?좎씪 ?뺣낫瑜??깅줉?쒕떎.
	 * @param MemoTodo - 硫붾え?좎씪 model
	 * 
	 * @param memoTodo
	 */
	public void insertMemoTodo(MemoTodo memoTodo) throws Exception;

	/**
	 * 硫붾え?좎씪 ?뺣낫瑜???젣?쒕떎.
	 * @param MemoTodo - 硫붾え?좎씪 model
	 * 
	 * @param memoTodo
	 */
	public void deleteMemoTodo(MemoTodo memoTodo) throws Exception;

	/**
	 * 硫붾え?좎씪 紐⑸줉 以??ㅻ뒛???좎씪??議고쉶?쒕떎.
	 * @param MemoTodoVO - 硫붾え?좎씪 VO
	 * @return  List<MemoTodoVO> - 硫붾え?좎씪 List
	 * 
	 * @param memoTodoVO
	 */
	public List<MemoTodoVO> selectMemoTodoListToday(MemoTodoVO memoTodoVO) throws Exception;

}