/**
 * ?대씪?댁뼵님而댄룷?뚰듃濡님꾨떖?섍린 님?쒕쾭 ?곗씠?곕? ?꾩슂님?꾨뱶留님④린怨님뺣━합니다
 * (Server Serialization Optimization)
 */
export function selectFields<T extends object, K extends keyof T>(
 data: T,
 fields: K[]
 ): Pick<T, K> {
 const result = {} as Pick<T, K>;
 fields.forEach((field) => {
 if (field in data) {
 result[field] = data[field];
 }
 });
 return result;
 }

 export function selectFieldsList<T extends object, K extends keyof T>(
 dataList: T[],
 fields: K[]
 ): Pick<T, K>[] {
 return dataList.map((item) => selectFields(item, fields));
 }
