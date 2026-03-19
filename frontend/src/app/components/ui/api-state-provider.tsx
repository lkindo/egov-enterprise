'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

interface ApiStateContextType {
 isGlobalLoading: boolean;
}

const ApiStateContext = createContext<ApiStateContextType | undefined>(undefined);

export function ApiStateProvider({ children }: { children: React.ReactNode }) {
 const fetching = useIsFetching();
 const mutating = useIsMutating();
 const [isGlobalLoading, setIsGlobalLoading] = useState(false);

 useEffect(() => {
 setIsGlobalLoading(fetching > 0 || mutating > 0);
 }, [fetching, mutating]);

 return (
 <ApiStateContext.Provider value={{ isGlobalLoading }}>
 {isGlobalLoading && (
 <div className="api-progress">
 <div className="api-progress-bar" />
 </div>
 )}
 {children}
 </ApiStateContext.Provider>
 );
}

export const useApiState = () => {
 const context = useContext(ApiStateContext);
 if (!context) throw new Error('useApiState must be used within ApiStateProvider');
 return context;
};
