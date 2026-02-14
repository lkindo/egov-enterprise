import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const SidebarSkeleton = () => {
    return (
        <nav className="nav" aria-label="Loading menu">
            <div className="inner">
                <h2 className="flex items-center">
                    <Skeleton className="h-8 w-24 bg-gray-200" />
                </h2>
                <ul className="menu_list space-y-4 pt-6">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <li key={i}>
                            <Skeleton className="h-6 w-full bg-gray-200" />
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
};
