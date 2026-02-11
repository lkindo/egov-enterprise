import { Skeleton } from "@/components/ui/skeleton";
import { TableRow, TableCell } from "@/components/ui/table";

interface TableSkeletonProps {
    columnCount: number;
    rowCount?: number;
}

export function TableSkeleton({ columnCount, rowCount = 5 }: TableSkeletonProps) {
    return (
        <>
            {Array.from({ length: rowCount }).map((_, i) => (
                <TableRow key={i}>
                    {Array.from({ length: columnCount }).map((_, j) => (
                        <TableCell key={j}>
                            <Skeleton className="h-6 w-full" />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
}
