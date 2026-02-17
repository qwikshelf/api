import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (row: T) => React.ReactNode;
    className?: string;
    searchable?: boolean;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    page?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    onRowClick?: (row: T) => void;
    searchPlaceholder?: string;
}

export function DataTable<T>({
    columns,
    data,
    loading,
    page,
    totalPages,
    onPageChange,
    onRowClick,
    searchPlaceholder = "Search...",
}: DataTableProps<T>) {
    const [search, setSearch] = useState("");

    const searchableKeys = columns
        .filter((c) => c.searchable !== false && c.accessorKey)
        .map((c) => c.accessorKey as string);

    const filtered = search.trim()
        ? data.filter((row) => {
            const q = search.toLowerCase();
            return searchableKeys.some((key) => {
                const val = (row as Record<string, unknown>)[key];
                return val != null && String(val).toLowerCase().includes(q);
            });
        })
        : data;

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input disabled placeholder={searchPlaceholder} className="pl-9" />
                </div>
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((col, i) => (
                                    <TableHead key={i} className={col.className}>{col.header}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {columns.map((_, j) => (
                                        <TableCell key={j}>
                                            <Skeleton className="h-5 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {searchableKeys.length > 0 && (
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="pl-9"
                    />
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((col, i) => (
                                    <TableHead key={i} className={col.className}>{col.header}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                    </Table>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Inbox className="h-10 w-10 mb-3" />
                        <p className="text-sm">{search ? "No matching results" : "No data found"}</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {columns.map((col, i) => (
                                        <TableHead key={i} className={col.className}>{col.header}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((row, i) => (
                                    <TableRow
                                        key={i}
                                        className={onRowClick ? "cursor-pointer" : ""}
                                        onClick={() => onRowClick?.(row)}
                                    >
                                        {columns.map((col, j) => (
                                            <TableCell key={j} className={col.className}>
                                                {col.cell
                                                    ? col.cell(row)
                                                    : col.accessorKey
                                                        ? String((row as Record<string, unknown>)[col.accessorKey as string] ?? "")
                                                        : ""}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {page !== undefined && totalPages !== undefined && totalPages > 1 && onPageChange && (
                        <div className="flex items-center justify-end gap-2">
                            <span className="text-sm text-muted-foreground mr-2">
                                Page {page} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={page <= 1}
                                onClick={() => onPageChange(page - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={page >= totalPages}
                                onClick={() => onPageChange(page + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
