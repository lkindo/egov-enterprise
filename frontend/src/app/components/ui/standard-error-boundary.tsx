'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
 children: ReactNode;
}

interface State {
 hasError: boolean;
 error: Error | null;
}

export class StandardErrorBoundary extends Component<Props, State> {
 public state: State = {
 hasError: false,
 error: null
 };

 public static getDerivedStateFromError(error: Error): State {
 return { hasError: true, error };
 }

 public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
 console.error('Uncaught error:', error, errorInfo);
 }

 public render() {
 if (this.state.hasError) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center border-2 border-dashed rounded-2xl bg-destructive/5 border-destructive/20">
 <div className="p-4 bg-destructive/10 text-destructive rounded-full mb-4">
 <AlertTriangle size={48} />
 </div>
 <h2 className="text-2xl font-bold text-foreground mb-2">?쒖뒪님?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎</h2>
 <p className="text-muted-foreground max-w-md mb-8">
 ?덉긽移?紐삵븳 臾몄젣媛 諛쒖깮?섏뿬 ?붾㈃님?쒖떆님님?놁뒿?덈떎. <br />
 ?좎떆 님?ㅼ떆 ?쒕룄?섍굅님愿由ъ옄?먭쾶 臾몄쓽님二쇱꽭님
 </p>
 <div className="flex gap-3">
 <button
 onClick={() => window.location.reload()}
 className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90 transition-colors"
 >
 <RefreshCcw size={18} />
 ?ㅼ떆 ?쒕룄
 </button>
 <button
 onClick={() => window.location.href = '/'}
 className="flex items-center gap-2 px-6 py-2.5 border rounded-md font-semibold hover:bg-accent transition-colors"
 >
 <Home size={18} />
 硫붿씤?쇰줈
 </button>
 </div>
 {process.env.NODE_ENV === 'development' && (
 <pre className="mt-8 p-4 bg-black text-red-400 text-sm text-left overflow-auto max-w-full rounded-lg">
 {this.state.error?.stack}
 </pre>
 )}
 </div>
 );
 }

 return this.props.children;
 }
}

