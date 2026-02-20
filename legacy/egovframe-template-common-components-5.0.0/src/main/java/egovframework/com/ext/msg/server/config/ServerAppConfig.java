/*
 * eGovFrame Web Messager
 * Copyright The eGovFrame Open Community (http://open.egovframe.go.kr)).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author ?댁쁺吏(?덊띁媛쒕컻?륦3)
 */
package egovframework.com.ext.msg.server.config;

import java.util.Map;

import org.springframework.web.context.ContextLoader;
import org.springframework.web.context.WebApplicationContext;

import jakarta.websocket.server.ServerEndpointConfig.Configurator;

/**
* @Class Name : ServerAppConfig.java
* @Description : EndPoint瑜?bean?쇰줈 ?닿린 ?꾪빐 ?ㅼ젙?섎뒗 Configurator(?ㅻⅨ Bean怨??곕룞 ??EndPoint???ㅼ젙?댁＜?댁빞 ??
* @Modification Information
*
*    ?섏젙??      ?섏젙??        ?섏젙?댁슜
*    -------        -------     -------------------
*    2014. 11. 27.    ?댁쁺吏
*
*/
//container?덉쓽 bean??DI?섍린 ?꾪빐 ?ъ슜
public class ServerAppConfig extends Configurator{

	 @Override
     public <T> T getEndpointInstance(Class<T> endpointClass) throws InstantiationException {

             WebApplicationContext wac = ContextLoader.getCurrentWebApplicationContext();
             if (wac == null) {
                     throw new IllegalStateException("Failed to find WebApplicationContext. "
                                     + "Was org.springframework.web.context.ContextLoader used to load the WebApplicationContext?");
             }

             Map<String, T> beans = wac.getBeansOfType(endpointClass);
             if (beans.isEmpty()) {
                     // Initialize a new bean instance
                     return wac.getAutowireCapableBeanFactory().createBean(endpointClass);
             }
             if (beans.size() == 1) {
                     // Return the matching bean instance
                     return beans.values().iterator().next();
             }
             else {
                     // This should never happen (@ServerEndpoint has a single path mapping) ..
                     throw new IllegalStateException("Found more than one matching beans of type " + endpointClass);
             }
     }
}
